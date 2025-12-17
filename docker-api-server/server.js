require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const { WebSocketServer } = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Store active containers: { sessionId: { containerId, createdAt } }
const activeContainers = new Map();

// Cleanup timeout (30 minutes)
const CONTAINER_TIMEOUT = 30 * 60 * 1000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Security middleware
const verifyApiSecret = (req, res, next) => {
  const secret = req.headers['x-api-secret'];
  if (secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', containers: activeContainers.size });
});

// Start a new container
app.post('/api/container/start', verifyApiSecret, async (req, res) => {
  const { image, sessionId, ports, challengeId } = req.body;

  if (!image || !sessionId) {
    return res.status(400).json({ error: 'Missing image or sessionId' });
  }

  try {
    // Check if session already has a container
    if (activeContainers.has(sessionId)) {
      const existing = activeContainers.get(sessionId);
      // Stop and remove existing container
      try {
        const oldContainer = docker.getContainer(existing.containerId);
        await oldContainer.stop().catch(() => {});
        await oldContainer.remove().catch(() => {});
      } catch (e) {
        console.log('Old container cleanup error (ignoring):', e.message);
      }
    }

    // Parse port mappings
    const portBindings = {};
    const exposedPorts = {};
    
    if (ports) {
      ports.split(',').forEach(mapping => {
        const [hostPort, containerPort] = mapping.trim().split(':');
        const portKey = `${containerPort}/tcp`;
        exposedPorts[portKey] = {};
        portBindings[portKey] = [{ HostPort: hostPort }];
      });
    }

    // Create container
    const container = await docker.createContainer({
      Image: image,
      name: `ctf-${sessionId}-${uuidv4().slice(0, 8)}`,
      Tty: true,
      OpenStdin: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      ExposedPorts: exposedPorts,
      HostConfig: {
        PortBindings: portBindings,
        Memory: 256 * 1024 * 1024, // 256MB limit
        CpuShares: 256,
        NetworkMode: 'bridge',
        AutoRemove: false
      },
      Labels: {
        'ctf.session': sessionId,
        'ctf.challenge': challengeId || 'unknown'
      }
    });

    await container.start();

    const containerInfo = await container.inspect();
    const containerId = containerInfo.Id;

    // Store container info
    activeContainers.set(sessionId, {
      containerId,
      createdAt: Date.now(),
      image,
      challengeId
    });

    console.log(`Container started: ${containerId} for session ${sessionId}`);

    // Set auto-cleanup timeout
    setTimeout(async () => {
      if (activeContainers.has(sessionId)) {
        const info = activeContainers.get(sessionId);
        if (info.containerId === containerId) {
          console.log(`Auto-cleanup container ${containerId}`);
          await stopContainer(containerId, sessionId);
        }
      }
    }, CONTAINER_TIMEOUT);

    res.json({
      success: true,
      containerId,
      message: 'Container started successfully'
    });

  } catch (error) {
    console.error('Error starting container:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop and remove a container
async function stopContainer(containerId, sessionId) {
  try {
    const container = docker.getContainer(containerId);
    await container.stop().catch(() => {});
    await container.remove().catch(() => {});
    activeContainers.delete(sessionId);
    console.log(`Container stopped: ${containerId}`);
    return true;
  } catch (error) {
    console.error('Error stopping container:', error);
    return false;
  }
}

app.post('/api/container/stop', verifyApiSecret, async (req, res) => {
  const { containerId, sessionId } = req.body;

  if (!containerId) {
    return res.status(400).json({ error: 'Missing containerId' });
  }

  const success = await stopContainer(containerId, sessionId);
  res.json({ success });
});

// Get container status
app.get('/api/container/status/:sessionId', verifyApiSecret, async (req, res) => {
  const { sessionId } = req.params;
  
  if (!activeContainers.has(sessionId)) {
    return res.json({ running: false });
  }

  const info = activeContainers.get(sessionId);
  
  try {
    const container = docker.getContainer(info.containerId);
    const status = await container.inspect();
    res.json({
      running: status.State.Running,
      containerId: info.containerId,
      createdAt: info.createdAt
    });
  } catch (error) {
    activeContainers.delete(sessionId);
    res.json({ running: false });
  }
});

// WebSocket terminal connection
wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const containerId = url.pathname.split('/').pop();
  const apiSecret = url.searchParams.get('secret');

  console.log(`WebSocket connection attempt for container: ${containerId}`);

  if (apiSecret !== process.env.API_SECRET) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  try {
    const container = docker.getContainer(containerId);
    
    // Create exec instance for shell
    const exec = await container.exec({
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: ['/bin/bash']
    });

    const stream = await exec.start({
      hijack: true,
      stdin: true,
      Tty: true
    });

    console.log(`Terminal attached to container: ${containerId}`);

    // Send output to WebSocket
    stream.on('data', (chunk) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(chunk.toString('utf-8'));
      }
    });

    // Receive input from WebSocket
    ws.on('message', (data) => {
      stream.write(data);
    });

    ws.on('close', () => {
      console.log(`WebSocket closed for container: ${containerId}`);
      stream.end();
    });

    stream.on('end', () => {
      ws.close();
    });

  } catch (error) {
    console.error('Terminal connection error:', error);
    ws.close(1011, error.message);
  }
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down, cleaning up containers...');
  for (const [sessionId, info] of activeContainers) {
    await stopContainer(info.containerId, sessionId);
  }
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Docker API server running on port ${PORT}`);
  console.log(`WebSocket terminal available at ws://localhost:${PORT}/api/terminal/:containerId`);
});
