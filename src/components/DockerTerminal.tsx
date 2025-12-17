import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Power, Loader2, ExternalLink, Container } from "lucide-react";
import { toast } from "sonner";

interface DockerTerminalProps {
  dockerImage: string;
  dockerPorts?: string;
  sessionId: string;
  challengeId: string;
  challengeTitle?: string;
}

const DockerTerminal: React.FC<DockerTerminalProps> = ({
  dockerImage,
  dockerPorts,
  sessionId,
  challengeId,
  challengeTitle = "Docker Terminal",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [containerId, setContainerId] = useState<string | null>(null);

  // Start container and open in new window
  const startAndOpenTerminal = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/docker/container/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      // Build URL for the new window
      const params = new URLSearchParams({
        containerId: data.containerId,
        title: challengeTitle,
        image: dockerImage,
        sessionId,
      });

      // Open in new window
      window.open(
        `/docker-shell?${params.toString()}`,
        `docker_${data.containerId}`,
        "width=900,height=600,menubar=no,toolbar=no,location=no,status=no"
      );

      toast.success("Container démarré ! Terminal ouvert dans une nouvelle fenêtre.");
    } catch (error) {
      console.error("Error starting container:", error);
      toast.error(error instanceof Error ? error.message : "Impossible de démarrer le container");
    } finally {
      setIsLoading(false);
    }
  }, [dockerImage, dockerPorts, sessionId, challengeId, challengeTitle]);

  // Reopen existing terminal
  const reopenTerminal = useCallback(() => {
    if (!containerId) return;

    const params = new URLSearchParams({
      containerId,
      title: challengeTitle,
      image: dockerImage,
      sessionId,
    });

    window.open(
      `/docker-shell?${params.toString()}`,
      `docker_${containerId}`,
      "width=900,height=600,menubar=no,toolbar=no,location=no,status=no"
    );
  }, [containerId, challengeTitle, dockerImage, sessionId]);

  return (
    <div className="rounded-lg border border-primary/30 bg-card/50 p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <Container className="w-12 h-12 text-primary/70" />
        <div>
          <p className="text-foreground font-medium mb-1">Challenge Docker interactif</p>
          <p className="text-muted-foreground text-sm font-mono">{dockerImage}</p>
        </div>

        {!containerId ? (
          <Button
            onClick={startAndOpenTerminal}
            disabled={isLoading}
            className="gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Démarrage...
              </>
            ) : (
              <>
                <Power className="w-4 h-4" />
                Lancer le Terminal Docker
              </>
            )}
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-green-500 font-mono">✓ Container en cours d'exécution</p>
            <Button onClick={reopenTerminal} variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Rouvrir le Terminal
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground max-w-sm">
          Le terminal s'ouvrira dans une nouvelle fenêtre. Trouve le flag dans le container et soumets-le ci-dessous.
        </p>
      </div>
    </div>
  );
};

export default DockerTerminal;
