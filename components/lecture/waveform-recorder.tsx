"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Pause, Play, Square } from "lucide-react";

interface WaveformRecorderProps {
  onRecordingComplete: (blob: Blob, mimeType: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?: boolean;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function WaveformRecorder({
  onRecordingComplete,
  onRecordingStateChange,
  disabled,
}: WaveformRecorderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const recordRef = useRef<RecordPlugin | null>(null);
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);

  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  useEffect(() => {
    onRecordingStateChangeRef.current = onRecordingStateChange;
  }, [onRecordingStateChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(99, 102, 241, 0.5)",
      progressColor: "rgb(99, 102, 241)",
      cursorColor: "transparent",
      height: 80,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
    });

    const record = ws.registerPlugin(
      RecordPlugin.create({
        scrollingWaveform: true,
        renderRecordedAudio: true,
      })
    );

    record.on("record-start", () => {
      setIsRecording(true);
      setIsPaused(false);
      setHasRecording(false);
      setDuration(0);
      onRecordingStateChangeRef.current?.(true);
    });

    record.on("record-progress", (d) => {
      setDuration(d);
    });

    record.on("record-pause", () => {
      setIsPaused(true);
    });

    record.on("record-resume", () => {
      setIsPaused(false);
    });

    record.on("record-end", (blob) => {
      setIsRecording(false);
      setIsPaused(false);
      setHasRecording(true);
      onRecordingStateChangeRef.current?.(false);
      onRecordingCompleteRef.current(blob, blob.type || "audio/webm");
    });

    wsRef.current = ws;
    recordRef.current = record;

    RecordPlugin.getAvailableAudioDevices()
      .then((deviceList) => {
        const audioInputs = deviceList.filter(
          (d) => d.kind === "audioinput" && d.deviceId
        );
        setDevices(audioInputs);
        // Seed a real deviceId before the Select ever mounts (it only
        // mounts once devices.length > 0) so its `value` prop is defined
        // from the first render — otherwise Base UI's Select flips from
        // uncontrolled (undefined) to controlled once a device is picked,
        // which it warns about (and won't handle if it flips at any point
        // after mount, uncontrolled/controlled must stay pinned for life).
        if (audioInputs.length > 0) {
          setSelectedDeviceId((current) => current || audioInputs[0].deviceId);
        }
      })
      .catch(() => {
        // Mic permission not granted yet, or device enumeration unsupported.
        // Recording with the default device still works, so this is non-fatal.
      });

    return () => {
      ws.destroy();
      wsRef.current = null;
      recordRef.current = null;
      onRecordingStateChangeRef.current?.(false);
    };
  }, []);

  const handleStart = useCallback(async () => {
    if (!recordRef.current) return;
    try {
      await recordRef.current.startRecording(
        selectedDeviceId ? { deviceId: selectedDeviceId } : undefined
      );
    } catch {
      toast.error(
        "Couldn't access the microphone. Check your browser permissions and try again."
      );
      setIsRecording(false);
    }
  }, [selectedDeviceId]);

  const handleStop = useCallback(() => {
    recordRef.current?.stopRecording();
  }, []);

  const handlePauseResume = useCallback(() => {
    if (!recordRef.current) return;
    if (isPaused) {
      recordRef.current.resumeRecording();
    } else {
      recordRef.current.pauseRecording();
    }
  }, [isPaused]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isRecording && !isPaused && (
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
          )}
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {formatDuration(duration)}
          </span>
          {isPaused && (
            <span className="text-xs text-muted-foreground">Paused</span>
          )}
        </div>

        {devices.length > 0 && (
          <Select
            value={selectedDeviceId}
            onValueChange={(value) => setSelectedDeviceId(value ?? devices[0].deviceId)}
            disabled={isRecording || disabled}
          >
            <SelectTrigger size="sm" className="max-w-[190px]">
              <SelectValue placeholder="Default microphone" />
            </SelectTrigger>
            <SelectContent className="w-64 max-w-[calc(100vw-2rem)]">
              {devices.map((d, i) => (
                <SelectItem
                  key={d.deviceId}
                  value={d.deviceId}
                  title={d.label || `Microphone ${i + 1}`}
                >
                  {d.label || `Microphone ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div
        ref={containerRef}
        className="h-20 w-full overflow-hidden rounded-lg bg-muted/40"
      />

      <div className="flex items-center justify-center gap-2">
        {!isRecording ? (
          <Button onClick={handleStart} disabled={disabled} className="gap-1.5">
            <Mic />
            {hasRecording ? "Record again" : "Start recording"}
          </Button>
        ) : (
          <>
            <Button variant="outline" size="icon" onClick={handlePauseResume}>
              {isPaused ? <Play /> : <Pause />}
            </Button>
            <Button
              variant="destructive"
              onClick={handleStop}
              className="gap-1.5"
            >
              <Square className="fill-current" />
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
