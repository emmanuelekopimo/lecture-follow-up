import Image from "next/image"
import { Download, Star } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Book } from "@/lib/types"

interface BookCardProps {
  book: Book
}

export function BookCard(props: BookCardProps) {
  const { book } = props

  return (
    <Card className="gap-3 overflow-hidden py-0 transition-shadow hover:shadow-md">
      <a
        href={book.viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Image
          src={book.coverUrl}
          alt={book.title}
          width={400}
          height={225}
          className="aspect-video h-auto w-full object-cover transition-opacity hover:opacity-90"
        />
      </a>
      <CardContent className="space-y-2">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {book.title}
        </h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {book.description}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            <Star className="size-3 fill-current" />
            {book.rating.toFixed(1)}
          </Badge>
          <Badge variant="secondary">{book.pages} pages</Badge>
          {book.courseCode ? (
            <Badge variant="outline">{book.courseCode}</Badge>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          nativeButton={false}
          render={
            <a href={book.viewUrl} target="_blank" rel="noopener noreferrer" />
          }
        >
          View
        </Button>
        <Button
          size="sm"
          className="flex-1"
          nativeButton={false}
          render={
            <a
              href={book.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <Download />
          Download
        </Button>
      </CardFooter>
    </Card>
  )
}
