import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Power, PowerOff, Loader2, Terminal } from "lucide-react";
import { toast } from "sonner";

interface DockerTerminalProps {
  dockerApiUrl: string;
  dockerApiSecret: string;
  dockerImage: string;
  dockerPorts?: string;
  sessionId: string;
  challengeId: string;
}

const DockerTerminal: React.FC<DockerTerminalProps> = ({
  dockerApiUrl,
  dockerApiSecret,
  dockerImage,
  dockerPorts,
  sessionId,
  challengeId,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Start container
  const startContainer = useCallback(async () => {
    setIsLoading(true);
    setTerminalOutput(["[SYSTEM] Démarrage du container..."]);
    
    try {
      const response = await fetch(`${dockerApiUrl}/api/container/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Secret": dockerApiSecret,
        },
        body: JSON.stringify({
          image: dockerImage,
          sessionId,
          ports: dockerPorts,
          challengeId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to start container");
      }

      setContainerId(data.containerId);
      setTerminalOutput((prev) => [...prev, "[SYSTEM] Container démarré!", "[SYSTEM] Connexion au terminal..."]);
      
      // Connect WebSocket
      connectTerminal(data.containerId);
      
    } catch (error) {
      console.error("Error starting container:", error);
      setTerminalOutput((prev) => [...prev, `[ERREUR] ${error instanceof Error ? error.message : "Erreur inconnue"}`]);
      toast.error("Impossible de démarrer le container");
    } finally {
      setIsLoading(false);
    }
  }, [dockerApiUrl, dockerApiSecret, dockerImage, dockerPorts, sessionId, challengeId]);

  // Connect to terminal WebSocket
  const connectTerminal = useCallback((cId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = dockerApiUrl.replace("http://", "ws://").replace("https://", "wss://");
    const ws = new WebSocket(`${wsUrl}/api/terminal/${cId}?secret=${encodeURIComponent(dockerApiSecret)}`);
    
    ws.onopen = () => {
      console.log("Terminal WebSocket connected");
      setIsConnected(true);
      setTerminalOutput((prev) => [...prev, "[SYSTEM] Terminal connecté! Tapez vos commandes."]);
      inputRef.current?.focus();
    };

    ws.onmessage = (event) => {
      const data = event.data;
      // Split by newlines and filter empty strings, but preserve formatting
      setTerminalOutput((prev) => [...prev, data]);
    };

    ws.onclose = () => {
      console.log("Terminal WebSocket disconnected");
      setIsConnected(false);
      setTerminalOutput((prev) => [...prev, "[SYSTEM] Connexion terminée."]);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setTerminalOutput((prev) => [...prev, "[ERREUR] Erreur de connexion WebSocket"]);
    };

    wsRef.current = ws;
  }, [dockerApiUrl, dockerApiSecret]);

  // Stop container
  const stopContainer = useCallback(async () => {
    if (!containerId) return;
    
    setIsLoading(true);
    
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const response = await fetch(`${dockerApiUrl}/api/container/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Secret": dockerApiSecret,
        },
        body: JSON.stringify({ containerId, sessionId }),
      });

      if (response.ok) {
        setContainerId(null);
        setIsConnected(false);
        setTerminalOutput((prev) => [...prev, "[SYSTEM] Container arrêté."]);
        toast.success("Container arrêté");
      }
    } catch (error) {
      console.error("Error stopping container:", error);
      toast.error("Erreur lors de l'arrêt du container");
    } finally {
      setIsLoading(false);
    }
  }, [containerId, dockerApiUrl, dockerApiSecret, sessionId]);

  // Restart container
  const restartContainer = useCallback(async () => {
    await stopContainer();
    setTerminalOutput([]);
    await startContainer();
  }, [stopContainer, startContainer]);

  // Send command
  const sendCommand = useCallback(() => {
    if (!currentInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(currentInput + "\n");
    setCurrentInput("");
  }, [currentInput]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendCommand();
    }
  };

  // Focus input on terminal click
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-black rounded-lg border border-primary/30 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/50 border-b border-primary/30">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-muted-foreground">
            {dockerImage}
          </span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        </div>
        <div className="flex items-center gap-2">
          {!containerId ? (
            <Button
              size="sm"
              onClick={startContainer}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              Démarrer
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={restartContainer}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Relancer
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={stopContainer}
                disabled={isLoading}
                className="gap-2"
              >
                <PowerOff className="w-4 h-4" />
                Arrêter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        onClick={handleTerminalClick}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm text-green-400 cursor-text min-h-[300px]"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        {terminalOutput.length === 0 ? (
          <div className="text-muted-foreground">
            Cliquez sur "Démarrer" pour lancer le container Docker...
          </div>
        ) : (
          terminalOutput.map((line, index) => (
            <pre key={index} className="whitespace-pre-wrap break-all">
              {line}
            </pre>
          ))
        )}
        
        {/* Input line */}
        {isConnected && (
          <div className="flex items-center mt-2">
            <span className="text-primary mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-green-400 font-mono"
              placeholder="Tapez votre commande..."
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DockerTerminal;
