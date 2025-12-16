import { useEffect, useRef } from "react";

interface MatrixRainProps {
  opacity?: number;
  speed?: number;
  density?: number;
}

const MatrixRain = ({ opacity = 0.9, speed = 1, density = 1 }: MatrixRainProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let columns: number;
    let drops: number[];

    const chars = "ISEN01HACK3RCYBERセキュリティアイウエオカキクケコサシスセソタチツテトナニヌネノ@#$%^&*(){}[]|/<>~";
    const charArray = chars.split("");
    const fontSize = 16;

    const initCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize) * density;
      drops = [];
      for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100;
      }
    };

    initCanvas();

    const draw = () => {
      // Darker trail for more visible characters
      ctx.fillStyle = "rgba(5, 10, 15, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        const x = (i / density) * fontSize;
        const y = drops[i] * fontSize;

        // Leading character - bright white/green
        if (drops[i] > 0) {
          ctx.font = `bold ${fontSize}px JetBrains Mono`;
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.fillText(char, x, y);

          // Trail characters with gradient
          for (let j = 1; j < 25; j++) {
            const trailY = y - j * fontSize;
            if (trailY > 0) {
              const alpha = Math.max(0, 1 - j * 0.06);
              const green = 185 - j * 3;
              ctx.font = `${fontSize}px JetBrains Mono`;
              ctx.fillStyle = `rgba(16, ${green}, 129, ${alpha})`;
              const trailChar = charArray[Math.floor(Math.random() * charArray.length)];
              ctx.fillText(trailChar, x, trailY);
            }
          }
        }

        // Reset when reaching bottom
        if (y > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i] += speed * (0.5 + Math.random() * 0.5);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      initCanvas();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [speed, density]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity }}
    />
  );
};

export default MatrixRain;