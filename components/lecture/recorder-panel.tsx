"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { WaveformRecorder } from "@/components/lecture/waveform-recorder";
import { WaveformPlayer } from "@/components/lecture/waveform-player";
import { Loader2, Mic, Sparkles, Upload, X } from "lucide-react";
import { cn } from "cn";

interface RecorderPanelProps {
  onSubmit: (audio: Blob, mimeType: string, fileName: string) => void;
  /** Fired when the user removes captured audio via the close button. */
  onClear?: () => void;
  disabled?: boolean;
}

type CapturedAudio = {
  blob: Blob;
  mimeType: string;
  fileName: string;
  url: string;
  source: "record" | "upload";
};

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function RecorderPanel({ onSubmit, onClear, disabled }: RecorderPanelProps) {
  const [tab, setTab] = useState<"record" | "upload">("record");
  const [captured, setCaptured] = useState<CapturedAudio | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const capturedUrlRef = useRef<string | null>(null);

  const clearCaptured = useCallback(() => {
    if (capturedUrlRef.current) {
      URL.revokeObjectURL(capturedUrlRef.current);
      capturedUrlRef.current = null;
    }
    setCaptured(null);
    setDuration(null);
  }, []);

  useEffect(() => {
    return () => {
      if (capturedUrlRef.current) {
        URL.revokeObjectURL(capturedUrlRef.current);
      }
    };
  }, []);

  const setCapturedAudio = useCallback(
    (blob: Blob, mimeType: string, fileName: string, source: "record" | "upload") => {
      if (capturedUrlRef.current) {
        URL.revokeObjectURL(capturedUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      capturedUrlRef.current = url;
      setDuration(null);
      setCaptured({ blob, mimeType, fileName, url, source });
    },
    []
  );

  const handleTabChange = useCallback(
    (value: string) => {
      setTab(value as "record" | "upload");
    },
    []
  );

  const handleRecordingComplete = useCallback(
    (blob: Blob, mimeType: string) => {
      const fileName = `recording.${extensionForMimeType(mimeType)}`;
      setCapturedAudio(blob, mimeType, fileName, "record");
    },
    [setCapturedAudio]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("audio/")) {
        toast.error("Please choose an audio file");
        return;
      }
      setCapturedAudio(file, file.type || "audio/mpeg", file.name, "upload");
    },
    [setCapturedAudio]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    clearCaptured();
    onClear?.();
  }, [clearCaptured, onClear]);

  // Best-effort duration probe once we have a captured audio URL.
  useEffect(() => {
    if (!captured) return;
    const audio = new Audio();
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.src = captured.url;
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [captured]);

  const handleSubmit = useCallback(() => {
    if (!captured) return;
    onSubmit(captured.blob, captured.mimeType, captured.fileName);
  }, [captured, onSubmit]);

  // Once audio is captured, replace the Record/Upload picker with a single
  // review card — showing both at once let a stale recorder or dropzone
  // linger behind the audio the user already picked, which was confusing.
  if (captured) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium">{captured.fileName}</p>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleRemove}
              aria-label="Remove audio"
            >
              <X />
            </Button>
          )}
        </div>

        <WaveformPlayer audioUrl={captured.url} />

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            {duration !== null ? `${formatDuration(duration)} · ` : ""}
            Ready to generate notes
          </p>
          <Button onClick={handleSubmit} disabled={disabled} className="gap-1.5">
            {disabled ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {disabled ? "Processing…" : "Generate Lecture Notes"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="record" className="gap-1.5">
          <Mic />
          Record
        </TabsTrigger>
        <TabsTrigger value="upload" className="gap-1.5" disabled={isRecordingActive}>
          <Upload />
          Upload
        </TabsTrigger>
      </TabsList>

      <TabsContent value="record" className="mt-4">
        <WaveformRecorder
          onRecordingComplete={handleRecordingComplete}
          onRecordingStateChange={setIsRecordingActive}
          disabled={disabled}
        />
      </TabsContent>

      <TabsContent value="upload" className="mt-4">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/40",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop an audio file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            MP3, WAV, M4A, WEBM and other audio formats
          </p>
        </label>
      </TabsContent>
    </Tabs>
  );
}
