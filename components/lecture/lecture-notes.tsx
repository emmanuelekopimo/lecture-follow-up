import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Card, CardContent } from "@/components/ui/card"

interface LectureNotesProps {
  markdown: string
}

export function LectureNotes(props: LectureNotesProps) {
  return (
    <Card>
      <CardContent
        className={[
          "prose prose-neutral dark:prose-invert max-w-none",
          "prose-headings:scroll-mt-20 prose-headings:font-heading",
          "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
          "prose-p:leading-relaxed prose-li:leading-relaxed",
          "prose-pre:bg-muted prose-pre:text-foreground",
          "prose-code:before:content-none prose-code:after:content-none",
          "prose-table:text-sm",
        ].join(" ")}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {props.markdown}
        </ReactMarkdown>
      </CardContent>
    </Card>
  )
}
