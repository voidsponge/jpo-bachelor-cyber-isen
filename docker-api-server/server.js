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

// Security middleware (optional - skip if no API_SECRET set)
const verifyApiSecret = (req, res, next) => {
  const secret = process.env.API_SECRET;
  // If no secret configured, allow all (for internal network use)
  if (!secret) {
    return next();
  }
  const providedSecret = req.headers['x-api-secret'];
  if (providedSecret !== secret) {
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

// Get flag from container (reads /flag.txt inside the container)
app.post('/api/container/verify-flag', verifyApiSecret, async (req, res) => {
  const { sessionId, submittedFlag } = req.body;

  if (!sessionId || !submittedFlag) {
    return res.status(400).json({ error: 'Missing sessionId or submittedFlag' });
  }

  if (!activeContainers.has(sessionId)) {
    return res.status(404).json({ error: 'No container running for this session', valid: false });
  }

  const info = activeContainers.get(sessionId);

  try {
    const container = docker.getContainer(info.containerId);
    
    // Execute command to read flag file
    const exec = await container.exec({
      Cmd: ['cat', '/flag.txt'],
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    
    // Collect output
    let flagContent = '';
    await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => {
        // Docker multiplexes stdout/stderr, skip the 8-byte header
        const data = chunk.slice(8).toString('utf-8');
        flagContent += data;
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    flagContent = flagContent.trim();
    
    if (!flagContent) {
      console.log(`No flag found in container ${info.containerId}`);
      return res.json({ valid: false, error: 'Flag not found in container' });
    }

    // Compare flags (case-insensitive)
    const isValid = submittedFlag.trim().toLowerCase() === flagContent.toLowerCase();
    console.log(`Flag verification for session ${sessionId}: ${isValid}`);
    
    res.json({ valid: isValid });

  } catch (error) {
    console.error('Error verifying flag from container:', error);
    res.status(500).json({ error: error.message, valid: false });
  }
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

// WebSocket terminal connection (xterm.js compatible)
wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const containerId = url.pathname.split('/').pop();

  console.log(`WebSocket connection attempt for container: ${containerId}`);

  try {
    const container = docker.getContainer(containerId);
    
    // Create exec instance for shell with PTY
    const exec = await container.exec({
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: ['/bin/sh', '-c', 'if command -v bash >/dev/null 2>&1; then exec bash; else exec sh; fi']
    });

    const stream = await exec.start({
      hijack: true,
      stdin: true,
      Tty: true
    });

    console.log(`Terminal attached to container: ${containerId}`);

    // Send raw output to WebSocket (xterm.js handles ANSI codes)
    stream.on('data', (chunk) => {
      if (ws.readyState === ws.OPEN) {
        // Send raw binary/text - xterm.js will handle it
        ws.send(chunk);
      }
    });

    // Receive input from WebSocket
    ws.on('message', (data) => {
      try {
        // Try parsing as JSON (for resize commands)
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'input') {
          stream.write(msg.data);
        } else if (msg.type === 'resize' && msg.cols && msg.rows) {
          // Resize the PTY
          exec.resize({ h: msg.rows, w: msg.cols }).catch(e => {
            console.log('Resize error (non-fatal):', e.message);
          });
        }
      } catch {
        // Not JSON, treat as raw input (fallback)
        stream.write(data);
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket closed for container: ${containerId}`);
      stream.end();
    });

    stream.on('end', () => {
      ws.close();
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
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
