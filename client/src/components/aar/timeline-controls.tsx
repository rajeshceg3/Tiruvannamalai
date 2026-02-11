import React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface TimelineControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number; // timestamp
  startTime: number;
  endTime: number;
  onSeek: (time: number) => void;
  speed: number;
  onSpeedChange: () => void;
}

export function TimelineControls({
  isPlaying,
  onPlayPause,
  currentTime,
  startTime,
  endTime,
  onSeek,
  speed,
  onSpeedChange
}: TimelineControlsProps) {

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const progress = Math.max(0, Math.min(100, ((currentTime - startTime) / (endTime - startTime)) * 100));

  return (
    <div className="bg-background/90 backdrop-blur border rounded-lg p-4 shadow-lg space-y-4">
      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span>START: {formatTime(startTime)}</span>
        <span className="text-primary font-bold">T-NOW: {formatTime(currentTime)}</span>
        <span>END: {formatTime(endTime)}</span>
      </div>

      <Slider
        value={[progress]}
        max={100}
        step={0.1}
        onValueChange={(val) => {
          const newTime = startTime + (val[0] / 100) * (endTime - startTime);
          onSeek(newTime);
        }}
        className="cursor-pointer"
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={onPlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onSpeedChange} className="font-mono text-xs w-12">
                {speed}x
            </Button>
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Tactical Playback
        </div>
      </div>
    </div>
  );
}
