import { NextRequest } from "next/server";
import { transcribeAudio, explainLecture } from "@/lib/openrouter";
import { searchBooks } from "@/lib/acadeva";
import type { Book, LectureStageEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type SttFormat = "wav" | "mp3" | "flac" | "m4a" | "ogg" | "webm" | "aac";

const MIME_TO_FORMAT: Record<string, SttFormat> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

const EXTENSION_TO_FORMAT: Record<string, SttFormat> = {
  webm: "webm",
  ogg: "ogg",
  mp3: "mp3",
  wav: "wav",
  m4a: "m4a",
  mp4: "m4a",
  aac: "aac",
  flac: "flac",
};

function resolveFormat(mimeType: string, filename: string): SttFormat | null {
  const normalizedMime = mimeType.split(";")[0].trim().toLowerCase();
  if (MIME_TO_FORMAT[normalizedMime]) {
    return MIME_TO_FORMAT[normalizedMime];
  }

  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_TO_FORMAT[ext]) {
    return EXTENSION_TO_FORMAT[ext];
  }

  return null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get("audio");
  const mimeTypeField = formData.get("mimeType");

  if (!audioFile || !(audioFile instanceof Blob)) {
    return Response.json({ error: "No audio file provided" }, { status: 400 });
  }

  const filename = audioFile instanceof File ? audioFile.name : "";
  const mimeType =
    audioFile.type || (typeof mimeTypeField === "string" ? mimeTypeField : "");

  const format = resolveFormat(mimeType, filename);
  if (!format) {
    return Response.json(
      {
        error: `Unsupported audio format "${mimeType || "unknown"}". Supported formats: wav, mp3, flac, m4a, ogg, webm, aac.`,
      },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: LectureStageEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const audioBase64 = Buffer.from(await audioFile.arrayBuffer()).toString(
          "base64"
        );

        send({ stage: "transcribing" });

        let transcript: string;
        try {
          transcript = await transcribeAudio({ audioBase64, format });
        } catch (err) {
          send({
            stage: "error",
            message: `Failed to transcribe audio: ${
              err instanceof Error ? err.message : String(err)
            }`,
          });
          controller.close();
          return;
        }

        send({ stage: "transcribed", transcript });

        send({ stage: "explaining" });

        let explainResult: { markdown: string; searchTerms: string[] };
        try {
          explainResult = await explainLecture(transcript);
        } catch (err) {
          send({
            stage: "error",
            message: `Failed to generate study notes: ${
              err instanceof Error ? err.message : String(err)
            }`,
          });
          controller.close();
          return;
        }

        send({ stage: "finding-books" });

        let books: Book[];
        try {
          books = await searchBooks(explainResult.searchTerms);
        } catch (err) {
          console.error("Book search failed:", err);
          books = [];
        }

        send({
          stage: "done",
          result: {
            markdown: explainResult.markdown,
            searchTerms: explainResult.searchTerms,
            books,
          },
        });

        controller.close();
      } catch (err) {
        send({
          stage: "error",
          message: err instanceof Error ? err.message : String(err),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
