"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { RecorderPanel } from "@/components/lecture/recorder-panel";
import {
  ProcessingStages,
  type ProcessingStage,
} from "@/components/lecture/processing-stages";
import { LectureNotes } from "@/components/lecture/lecture-notes";
import { BookGrid } from "@/components/lecture/book-grid";
import type { LectureResult, LectureStageEvent } from "@/lib/types";

export default function Home() {
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [result, setResult] = useState<LectureResult | null>(null);

  const isProcessing =
    stage === "transcribing" || stage === "explaining" || stage === "finding-books";

  const handleSubmit = useCallback(
    async (audio: Blob, mimeType: string, fileName: string) => {
      setResult(null);
      setErrorMessage(undefined);
      setStage("transcribing");

      try {
        const formData = new FormData();
        formData.append("audio", audio, fileName);
        formData.append("mimeType", mimeType);

        const res = await fetch("/api/lecture", {
          method: "POST",
          body: formData,
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as LectureStageEvent;

            if (event.stage === "error") {
              setStage("error");
              setErrorMessage(event.message);
              toast.error(event.message);
              return;
            }

            if (event.stage === "done") {
              setResult(event.result);
              setStage("done");
              return;
            }

            if (
              event.stage === "transcribing" ||
              event.stage === "explaining" ||
              event.stage === "finding-books"
            ) {
              setStage(event.stage);
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStage("error");
        setErrorMessage(message);
        toast.error(message);
      }
    },
    []
  );

  const handleClear = useCallback(() => {
    setStage("idle");
    setErrorMessage(undefined);
    setResult(null);
  }, []);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Lecture Follow-Up
          </h1>
          <p className="text-sm text-muted-foreground">
            Record or upload a lecture. Get back clear study notes and related
            textbooks.
          </p>
        </div>

        <RecorderPanel
          onSubmit={handleSubmit}
          onClear={handleClear}
          disabled={isProcessing}
        />

        <ProcessingStages stage={stage} errorMessage={errorMessage} />

        {stage === "done" && result && (
          <div className="flex flex-col gap-8">
            <LectureNotes markdown={result.markdown} />
            <BookGrid books={result.books} />
          </div>
        )}
      </main>
    </div>
  );
}
