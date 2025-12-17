import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { Loader2, RefreshCw, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const DockerShell = () => {
  const [searchParams] = useSearchParams();
  const containerId = searchParams.get("containerId");
  const challengeTitle = searchParams.get("title") || "Docker Terminal";
  const dockerImage = searchParams.get("image") || "";
  const sessionId = searchParams.get("sessionId") || "";

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize xterm
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      theme: {
        background: "#0a0a0a",
        foreground: "#00ff00",
        cursor: "#00ff00",
        cursorAccent: "#0a0a0a",
        selectionBackground: "#00ff0050",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      // Send resize to server if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows,
        }));
      }
    };

    window.addEventListener("resize", handleResize);

    // Send input to WebSocket
    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data }));
      }
    });

    term.writeln("\x1b[1;34m[INFO]\x1b[0m Connexion au container...");

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Connect WebSocket
  const connectTerminal = useCallback(() => {
    if (!containerId || !xtermRef.current) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const term = xtermRef.current;
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/docker/terminal/${containerId}`);

    ws.onopen = () => {
      setIsConnected(true);
      term.writeln("\x1b[1;32m[OK]\x1b[0m Terminal connecté!\n");
      // Send initial size
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        ws.send(JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows,
        }));
      }
    };

    ws.onmessage = (event) => {
      // Handle binary or text data
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "output") {
            term.write(msg.data);
          }
        } catch {
          // Raw string output
          term.write(event.data);
        }
      } else {
        // Binary data
        const reader = new FileReader();
        reader.onload = () => {
          term.write(new Uint8Array(reader.result as ArrayBuffer));
        };
        reader.readAsArrayBuffer(event.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      term.writeln("\n\x1b[1;33m[INFO]\x1b[0m Connexion terminée.");
    };

    ws.onerror = () => {
      term.writeln("\n\x1b[1;31m[ERREUR]\x1b[0m Erreur de connexion WebSocket");
    };

    wsRef.current = ws;
  }, [containerId]);

  // Initial connection
  useEffect(() => {
    if (containerId) {
      // Small delay to ensure terminal is ready
      const timer = setTimeout(connectTerminal, 100);
      return () => clearTimeout(timer);
    }
  }, [containerId, connectTerminal]);

  // Cleanup
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Stop container
  const stopContainer = async () => {
    if (!containerId) return;
    setIsLoading(true);
    try {
      wsRef.current?.close();
      await fetch(`/api/docker/container/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerId, sessionId }),
      });
      window.close();
    } catch (error) {
      console.error("Error stopping container:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!containerId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-red-500 font-mono">Erreur: Aucun containerId fourni</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <span className="font-mono text-white font-bold">{challengeTitle}</span>
          <span className="text-zinc-500 font-mono text-sm">{dockerImage}</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={connectTerminal}
            disabled={isLoading || isConnected}
            className="gap-2 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className="w-4 h-4" />
            Reconnecter
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={stopContainer}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
            Arrêter & Fermer
          </Button>
        </div>
      </div>

      {/* Terminal */}
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
};

export default DockerShell;
