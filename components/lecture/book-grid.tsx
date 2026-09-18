import { BookCard } from "@/components/lecture/book-card"
import type { Book } from "@/lib/types"

interface BookGridProps {
  books: Book[]
}

export function BookGrid(props: BookGridProps) {
  const { books } = props

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Related Reading from Acadeva</h2>
      {books.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No related books found.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </section>
  )
}
