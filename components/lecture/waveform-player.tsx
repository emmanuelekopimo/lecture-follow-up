"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { cn } from "cn";

interface WaveformPlayerProps {
  audioUrl: string;
  fileName?: string;
  className?: string;
}

function formatTime(seconds: number) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function WaveformPlayer({
  audioUrl,
  fileName,
  className,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalTime(0);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(99, 102, 241, 0.5)",
      progressColor: "rgb(99, 102, 241)",
      cursorColor: "rgb(99, 102, 241)",
      cursorWidth: 2,
      height: 60,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      interact: true,
      dragToSeek: true,
      url: audioUrl,
    });

    ws.on("ready", (duration) => {
      setIsReady(true);
      setTotalTime(duration);
    });
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));
    ws.on("timeupdate", (time) => setCurrentTime(time));

    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [audioUrl]);

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-card p-4", className)}>
      {fileName && (
        <p className="truncate text-xs font-medium text-muted-foreground">
          {fileName}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!isReady}
          onClick={() => wsRef.current?.playPause()}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <div
          ref={containerRef}
          className="h-15 w-full flex-1 cursor-pointer overflow-hidden rounded-lg bg-muted/40"
        />
        <span className="w-[72px] shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(totalTime)}
        </span>
      </div>
    </div>
  );
}
