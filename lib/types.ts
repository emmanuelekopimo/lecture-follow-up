export interface Book {
  id: string;
  title: string;
  description: string;
  cover: string;
  rating: number;
  downloads: number;
  pages: number;
  size: number;
  fileId: string;
  courseCode?: string;
  coverUrl: string;
  viewUrl: string;
  downloadUrl: string;
}

export interface LectureResult {
  markdown: string;
  searchTerms: string[];
  books: Book[];
}

/**
 * Stages streamed to the client as newline-delimited JSON while
 * POST /api/lecture processes an uploaded/recorded audio file.
 */
export type LectureStageEvent =
  | { stage: "transcribing" }
  | { stage: "transcribed"; transcript: string }
  | { stage: "explaining" }
  | { stage: "finding-books" }
  | { stage: "done"; result: LectureResult }
  | { stage: "error"; message: string };
