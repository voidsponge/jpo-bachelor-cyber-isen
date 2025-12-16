import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skull, Send, X, Image, Type, Clock, Palette } from "lucide-react";

// Preset GIFs for quick trolling
const PRESET_GIFS = [
  { name: "Rickroll", url: "https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif" },
  { name: "Deal With It", url: "https://media.giphy.com/media/ENagATV1Gr9eg/giphy.gif" },
  { name: "Hacker", url: "https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif" },
  { name: "Mind Blown", url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
  { name: "You're Winner", url: "https://media.giphy.com/media/a0h7sAqON67nO/giphy.gif" },
  { name: "Nope", url: "https://media.giphy.com/media/6h4z4b3v6XWxO/giphy.gif" },
];

const TEXT_COLORS = [
  { name: "Vert Cyber", value: "#10B981" },
  { name: "Rouge Alerte", value: "#EF4444" },
  { name: "Bleu Électrique", value: "#3B82F6" },
  { name: "Jaune Warning", value: "#F59E0B" },
  { name: "Rose Flashy", value: "#EC4899" },
  { name: "Blanc", value: "#FFFFFF" },
];

const TrollModePanel = () => {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState("");
  const [text, setText] = useState("");
  const [duration, setDuration] = useState(5);
  const [textColor, setTextColor] = useState("#10B981");
  const [textSize, setTextSize] = useState("4rem");
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const sendOverlay = async () => {
    if (!imageUrl && !text) {
      toast({
        title: "Erreur",
        description: "Ajoute au moins une image ou du texte",
        variant: "destructive",
      });
      return;
    }

    const channel = supabase.channel("troll-overlay");
    
    await channel.subscribe();
    
    await channel.send({
      type: "broadcast",
      event: "show-overlay",
      payload: {
        imageUrl,
        text,
        duration,
        textColor,
        textSize,
        showCloseButton,
      },
    });

    setIsActive(true);
    
    toast({
      title: "😈 Troll Mode Activé !",
      description: `Overlay envoyé pour ${duration} secondes`,
      className: "bg-destructive/20 border-destructive",
    });

    // Auto-reset after duration
    setTimeout(() => {
      setIsActive(false);
    }, duration * 1000);
  };

  const hideOverlay = async () => {
    const channel = supabase.channel("troll-overlay");
    
    await channel.subscribe();
    
    await channel.send({
      type: "broadcast",
      event: "hide-overlay",
      payload: {},
    });

    setIsActive(false);
    
    toast({
      title: "Overlay masqué",
      description: "L'overlay a été retiré de tous les écrans",
    });
  };

  return (
    <Card className="bg-destructive/5 border-destructive/30">
      <CardHeader>
        <CardTitle className="font-mono flex items-center gap-2 text-destructive">
          <Skull className="h-5 w-5" />
          Troll Mode 😈
        </CardTitle>
        <CardDescription>
          Affiche un overlay plein écran sur tous les participants pendant l'événement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Image / GIF URL
          </Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://media.giphy.com/media/..."
            className="bg-background/50"
          />
          
          {/* Preset GIFs */}
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESET_GIFS.map((gif) => (
              <Button
                key={gif.name}
                variant="outline"
                size="sm"
                onClick={() => setImageUrl(gif.url)}
                className={`text-xs ${imageUrl === gif.url ? "border-primary bg-primary/10" : ""}`}
              >
                {gif.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {imageUrl && (
          <div className="rounded-lg overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
              onError={() => setImageUrl("")}
            />
          </div>
        )}

        {/* Text */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Texte à afficher
          </Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="GET PWNED 💀"
            className="bg-background/50 font-mono"
            rows={2}
          />
        </div>

        {/* Text Color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Couleur du texte
          </Label>
          <div className="flex flex-wrap gap-2">
            {TEXT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setTextColor(color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  textColor === color.value ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Text Size */}
        <div className="space-y-2">
          <Label>Taille du texte</Label>
          <div className="flex gap-2">
            {["2rem", "3rem", "4rem", "5rem", "6rem"].map((size) => (
              <Button
                key={size}
                variant="outline"
                size="sm"
                onClick={() => setTextSize(size)}
                className={`text-xs ${textSize === size ? "border-primary bg-primary/10" : ""}`}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Durée: {duration} secondes
          </Label>
          <Slider
            value={[duration]}
            onValueChange={(value) => setDuration(value[0])}
            min={1}
            max={60}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1s</span>
            <span>30s</span>
            <span>60s</span>
          </div>
        </div>

        {/* Show Close Button */}
        <div className="flex items-center justify-between">
          <Label htmlFor="show-close">Afficher bouton fermer</Label>
          <Switch
            id="show-close"
            checked={showCloseButton}
            onCheckedChange={setShowCloseButton}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={sendOverlay}
            className="flex-1 gap-2"
            variant={isActive ? "secondary" : "default"}
            disabled={isActive}
          >
            <Send className="h-4 w-4" />
            {isActive ? "En cours..." : "Envoyer l'overlay"}
          </Button>
          {isActive && (
            <Button onClick={hideOverlay} variant="destructive" className="gap-2">
              <X className="h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        {/* Preview Text */}
        {text && (
          <div className="p-4 rounded-lg bg-black/50 text-center">
            <span
              className="font-mono font-bold"
              style={{
                color: textColor,
                fontSize: `calc(${textSize} / 2)`,
                textShadow: `0 0 10px ${textColor}`,
              }}
            >
              {text}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrollModePanel;