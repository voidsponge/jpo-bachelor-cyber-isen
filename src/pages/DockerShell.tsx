import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Terminal, RefreshCw, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// Strip ANSI escape codes
const stripAnsi = (str: string) => {
  return str
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\([A-Z]/g, '');
};

const DockerShell = () => {
  const [searchParams] = useSearchParams();
  const containerId = searchParams.get("containerId");
  const challengeTitle = searchParams.get("title") || "Docker Terminal";
  const dockerImage = searchParams.get("image") || "";
  const sessionId = searchParams.get("sessionId") || "";

  const [isConnected, setIsConnected] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Connect WebSocket
  const connectTerminal = useCallback(() => {
    if (!containerId) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    setTerminalOutput(["Connexion au terminal..."]);
    
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/docker/terminal/${containerId}`);

    ws.onopen = () => {
      setIsConnected(true);
      setTerminalOutput(["Terminal connecté. Tapez vos commandes.\n"]);
      inputRef.current?.focus();
    };

    ws.onmessage = (event) => {
      const cleanData = stripAnsi(event.data);
      if (cleanData.trim()) {
        setTerminalOutput((prev) => [...prev, cleanData]);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTerminalOutput((prev) => [...prev, "\n[Connexion terminée]"]);
    };

    ws.onerror = () => {
      setTerminalOutput((prev) => [...prev, "\n[Erreur de connexion WebSocket]"]);
    };

    wsRef.current = ws;
  }, [containerId]);

  // Initial connection
  useEffect(() => {
    if (containerId) {
      connectTerminal();
    }
    return () => {
      wsRef.current?.close();
    };
  }, [containerId, connectTerminal]);

  // Send command
  const sendCommand = useCallback(() => {
    if (!currentInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(currentInput + "\n");
    setCurrentInput("");
  }, [currentInput]);

  // Key handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendCommand();
    }
  };

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

  // Focus on click
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  if (!containerId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-red-500 font-mono">Erreur: Aucun containerId fourni</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
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
      <div
        ref={terminalRef}
        onClick={handleTerminalClick}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm text-green-400 cursor-text"
      >
        {terminalOutput.map((line, index) => (
          <pre key={index} className="whitespace-pre-wrap break-all">
            {line}
          </pre>
        ))}

        {isConnected && (
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-green-400 font-mono caret-green-400"
              autoFocus
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DockerShell;
