import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

interface TrollOverlayData {
  imageUrl: string;
  text: string;
  duration: number; // in seconds
  textColor: string;
  textSize: string;
  showCloseButton: boolean;
}

const TrollOverlay = () => {
  const [overlay, setOverlay] = useState<TrollOverlayData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to troll overlay broadcasts
    const channel = supabase
      .channel("troll-overlay")
      .on("broadcast", { event: "show-overlay" }, (payload) => {
        const data = payload.payload as TrollOverlayData;
        setOverlay(data);
        setIsVisible(true);

        // Auto-hide after duration
        if (data.duration > 0) {
          setTimeout(() => {
            setIsVisible(false);
            setOverlay(null);
          }, data.duration * 1000);
        }
      })
      .on("broadcast", { event: "hide-overlay" }, () => {
        setIsVisible(false);
        setOverlay(null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!isVisible || !overlay) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      {/* Background Image/GIF */}
      {overlay.imageUrl && (
        <img
          src={overlay.imageUrl}
          alt="Troll overlay"
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}

      {/* Overlay Text */}
      {overlay.text && (
        <div
          className="absolute inset-0 flex items-center justify-center p-8"
          style={{ backgroundColor: overlay.imageUrl ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
          <h1
            className="font-mono font-bold text-center animate-pulse drop-shadow-[0_0_30px_currentColor]"
            style={{
              color: overlay.textColor || "#10B981",
              fontSize: overlay.textSize || "4rem",
              textShadow: `0 0 20px ${overlay.textColor || "#10B981"}, 0 0 40px ${overlay.textColor || "#10B981"}`,
            }}
          >
            {overlay.text}
          </h1>
        </div>
      )}

      {/* Close button (optional) */}
      {overlay.showCloseButton && (
        <button
          onClick={() => {
            setIsVisible(false);
            setOverlay(null);
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
};

export default TrollOverlay;