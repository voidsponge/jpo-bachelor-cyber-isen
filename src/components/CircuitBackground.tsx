import { useEffect, useRef } from "react";

const CircuitBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Circuit nodes
    interface Node {
      x: number;
      y: number;
      connections: number[];
      pulseProgress: number;
      pulseActive: boolean;
      pulseDirection: number;
    }

    const nodes: Node[] = [];
    const gridSize = 80;
    const cols = Math.ceil(canvas.width / gridSize) + 1;
    const rows = Math.ceil(canvas.height / gridSize) + 1;

    // Create grid of nodes with some randomness
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (Math.random() > 0.3) {
          nodes.push({
            x: i * gridSize + (Math.random() - 0.5) * 20,
            y: j * gridSize + (Math.random() - 0.5) * 20,
            connections: [],
            pulseProgress: 0,
            pulseActive: false,
            pulseDirection: -1,
          });
        }
      }
    }

    // Create connections between nearby nodes
    nodes.forEach((node, i) => {
      nodes.forEach((other, j) => {
        if (i !== j) {
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          if (dist < gridSize * 1.5 && Math.random() > 0.5) {
            node.connections.push(j);
          }
        }
      });
    });

    // Randomly activate pulses
    const activatePulse = () => {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      if (randomNode.connections.length > 0 && !randomNode.pulseActive) {
        randomNode.pulseActive = true;
        randomNode.pulseProgress = 0;
        randomNode.pulseDirection = Math.floor(Math.random() * randomNode.connections.length);
      }
    };

    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw connections (circuit traces)
      nodes.forEach((node, i) => {
        node.connections.forEach((connIndex) => {
          const other = nodes[connIndex];
          
          // Draw trace with right angles
          ctx.beginPath();
          ctx.strokeStyle = "rgba(220, 38, 38, 0.15)";
          ctx.lineWidth = 1;
          
          const midX = node.x + (other.x - node.x) * 0.5;
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(midX, node.y);
          ctx.lineTo(midX, other.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        });
      });

      // Draw nodes (connection points)
      nodes.forEach((node) => {
        // Outer glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 8);
        gradient.addColorStop(0, "rgba(220, 38, 38, 0.4)");
        gradient.addColorStop(1, "rgba(220, 38, 38, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Inner node
        ctx.fillStyle = "rgba(220, 38, 38, 0.6)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Animate pulses
      nodes.forEach((node, i) => {
        if (node.pulseActive && node.connections.length > 0) {
          const targetIndex = node.connections[node.pulseDirection % node.connections.length];
          const target = nodes[targetIndex];

          node.pulseProgress += 0.02;

          // Calculate pulse position along the path
          const midX = node.x + (target.x - node.x) * 0.5;
          let pulseX, pulseY;

          if (node.pulseProgress < 0.33) {
            const t = node.pulseProgress / 0.33;
            pulseX = node.x + (midX - node.x) * t;
            pulseY = node.y;
          } else if (node.pulseProgress < 0.66) {
            const t = (node.pulseProgress - 0.33) / 0.33;
            pulseX = midX;
            pulseY = node.y + (target.y - node.y) * t;
          } else {
            const t = (node.pulseProgress - 0.66) / 0.34;
            pulseX = midX + (target.x - midX) * t;
            pulseY = target.y;
          }

          // Draw pulse with glow
          const pulseGradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 15);
          pulseGradient.addColorStop(0, "rgba(255, 100, 100, 1)");
          pulseGradient.addColorStop(0.3, "rgba(220, 38, 38, 0.8)");
          pulseGradient.addColorStop(1, "rgba(220, 38, 38, 0)");
          ctx.fillStyle = pulseGradient;
          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 15, 0, Math.PI * 2);
          ctx.fill();

          // Bright center
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 3, 0, Math.PI * 2);
          ctx.fill();

          if (node.pulseProgress >= 1) {
            node.pulseActive = false;
            node.pulseProgress = 0;
            // Chain reaction
            if (Math.random() > 0.3) {
              target.pulseActive = true;
              target.pulseProgress = 0;
              target.pulseDirection = Math.floor(Math.random() * target.connections.length);
            }
          }
        }
      });

      requestAnimationFrame(animate);
    };

    // Start with black background
    ctx.fillStyle = "rgb(10, 10, 15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    animate();

    // Periodically activate new pulses
    const pulseInterval = setInterval(activatePulse, 500);

    return () => {
      window.removeEventListener("resize", resize);
      clearInterval(pulseInterval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: "rgb(10, 10, 15)" }}
    />
  );
};

export default CircuitBackground;
