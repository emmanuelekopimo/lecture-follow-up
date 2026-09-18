# Lecture Follow-Up

Record a lecture in the browser (or upload an audio file) and get back clear, structured Markdown
study notes plus a set of related textbooks pulled from the Acadeva library.

## How it works

1. **Capture** — record audio live (with a real-time waveform) or upload an audio file (mp3, wav,
   m4a, ogg, webm, aac, flac), with a playback waveform preview.
2. **Transcribe** — the audio is sent to OpenRouter's speech-to-text endpoint
   (`openai/whisper-large-v3` by default).
3. **Explain** — the transcript is sent to an OpenRouter chat model (`openai/gpt-4o-mini` by
   default) with a structured JSON schema, returning Markdown study notes and a list of search
   terms describing the lecture's topics.
4. **Find related books** — each search term is used to query the Acadeva library
   (`api.acadeva.xyz`), and the results are merged, deduped, and ranked into a set of related
   textbooks with covers, ratings, and download links.

Progress streams to the UI stage by stage (Transcribing → Writing notes → Finding books) instead
of a single blocking spinner.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env` (already present in this project) and set:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENROUTER_KEY` | Yes | — | OpenRouter API key. **Audio requests (both transcription and any audio-input chat call) require the key to have at least $0.50 of available balance/limit** — this is a platform-level minimum, independent of actual per-request cost. |
| `OPENROUTER_STT_MODEL` | No | `openai/whisper-large-v3` | Any model from `GET /api/v1/models?output_modalities=transcription`. |
| `OPENROUTER_EXPLAIN_MODEL` | No | `openai/gpt-4o-mini` | Any model supporting `response_format: json_schema` with `strict: true`. |

## Test files

Sample lecture recordings are in `testfiles/` for manual testing of the upload path.

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · wavesurfer.js · react-markdown
