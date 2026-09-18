import type { Book } from "./types";

const ACADEVA_BASE_URL = "https://api.acadeva.xyz/public/books/search";
const MAX_TERMS = 6;
const MAX_RESULTS = 8;

interface RawBook {
  title: string;
  description: string;
  cover: string;
  rating: number;
  downloads: number;
  pages: number;
  id: string;
  size: number;
  fileId: string;
  magic?: { code?: string };
}

interface AcadevaSearchResponse {
  results: RawBook[];
  studyPartners: unknown[];
}

async function fetchTerm(term: string, limit: number): Promise<RawBook[]> {
  try {
    const url = `${ACADEVA_BASE_URL}?q=${encodeURIComponent(term)}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Acadeva search failed for term "${term}": ${res.status}`);
      return [];
    }
    const data = (await res.json()) as AcadevaSearchResponse;
    return data.results ?? [];
  } catch (err) {
    console.error(`Acadeva search errored for term "${term}":`, err);
    return [];
  }
}

// The `d` query param on the cdn download endpoint forces
// `Content-Disposition: attachment` (a direct download) instead of an
// inline view. `fileId` can itself already contain a query string
// (e.g. "...?s=1"), so append with `&` in that case.
function buildDownloadUrl(fileId: string): string {
  const separator = fileId.includes("?") ? "&" : "?";
  return `http://cdn.acadeva.xyz/dl/${fileId}${separator}d`;
}

function mapBook(raw: RawBook): Book {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    cover: raw.cover,
    rating: raw.rating,
    downloads: raw.downloads,
    pages: raw.pages,
    size: raw.size,
    fileId: raw.fileId,
    courseCode: raw.magic?.code || undefined,
    coverUrl: `https://res.cloudinary.com/acadeva/image/upload/${raw.cover}`,
    viewUrl: `http://go.acadeva.xyz/book/${raw.id}`,
    downloadUrl: buildDownloadUrl(raw.fileId),
  };
}

export async function searchBooks(terms: string[]): Promise<Book[]> {
  const cleanedTerms = Array.from(
    new Set(terms.map((t) => t.trim()).filter((t) => t.length > 0))
  ).slice(0, MAX_TERMS);

  if (cleanedTerms.length === 0) {
    return [];
  }

  const matchCounts = new Map<string, number>();
  const bookById = new Map<string, RawBook>();

  const mergeResults = (rawBooks: RawBook[]) => {
    const seenInThisSearch = new Set<string>();
    for (const raw of rawBooks) {
      if (seenInThisSearch.has(raw.id)) continue;
      seenInThisSearch.add(raw.id);
      if (!bookById.has(raw.id)) {
        bookById.set(raw.id, raw);
      }
      matchCounts.set(raw.id, (matchCounts.get(raw.id) ?? 0) + 1);
    }
  };

  const perTermResults = await Promise.all(
    cleanedTerms.map((term) => fetchTerm(term, 8))
  );
  for (const results of perTermResults) {
    mergeResults(results);
  }

  if (bookById.size < 5) {
    const fallbackTerm = cleanedTerms.join(" ").slice(0, 60);
    const fallbackResults = await fetchTerm(fallbackTerm, 10);
    mergeResults(fallbackResults);
  }

  const sorted = Array.from(bookById.values()).sort((a, b) => {
    const matchA = matchCounts.get(a.id) ?? 0;
    const matchB = matchCounts.get(b.id) ?? 0;
    if (matchB !== matchA) return matchB - matchA;

    const scoreA = a.downloads > 0 ? a.rating * a.downloads : a.rating;
    const scoreB = b.downloads > 0 ? b.rating * b.downloads : b.rating;
    return scoreB - scoreA;
  });

  return sorted.slice(0, MAX_RESULTS).map(mapBook);
}
