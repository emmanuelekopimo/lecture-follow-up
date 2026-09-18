const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const SYSTEM_INSTRUCTION = `You are an expert teaching assistant who turns lecture transcripts into clear, well-organized study notes.

Given a raw transcript of a recorded lecture (it may contain filler words, false starts, or
transcription errors — use your judgement to clean these up), produce:

1. \`markdown\`: A thorough explanation of the lecture in GitHub-flavored Markdown. Structure it with:
   - A single H1 title summarizing the lecture topic
   - H2 sections for each major theme/concept covered, in the order discussed
   - Explanations in your own words (not a cleaned transcript) — define key terms, explain why
     concepts matter, and give a concrete example where it helps understanding
   - Bullet points or numbered lists for enumerations, steps, or comparisons
   - **Bold** for key terms on first mention
   - A short "Key Takeaways" section at the end (3-5 bullets)
   Do not include a raw transcript. Do not wrap the response in a code fence.

2. \`searchTerms\`: An array of 3 to 6 short search phrases (2-4 words each) naming the core
   academic subjects/topics of the lecture, phrased the way a university textbook catalog would
   (e.g. "network security fundamentals", "symmetric encryption") — not quotes from the transcript.`;

export async function transcribeAudio(params: {
  audioBase64: string;
  format: string;
}): Promise<string> {
  const model = process.env.OPENROUTER_STT_MODEL ?? "openai/whisper-large-v3";

  const res = await fetch(`${OPENROUTER_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input_audio: {
        data: params.audioBase64,
        format: params.format,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Transcription request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { text: string; usage?: unknown };
  return data.text;
}

export async function explainLecture(
  transcript: string
): Promise<{ markdown: string; searchTerms: string[] }> {
  const model = process.env.OPENROUTER_EXPLAIN_MODEL ?? "openai/gpt-4o-mini";

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: `Transcript:\n${transcript}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lecture_explanation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              markdown: { type: "string" },
              searchTerms: { type: "array", items: { type: "string" } },
            },
            required: ["markdown", "searchTerms"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Explain request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content) as {
    markdown: string;
    searchTerms: string[];
  };

  return parsed;
}
