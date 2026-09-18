import { AlertCircle, CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "cn"
import { Progress } from "@/components/ui/progress"

export type ProcessingStage =
  | "idle"
  | "transcribing"
  | "explaining"
  | "finding-books"
  | "done"
  | "error"

interface ProcessingStagesProps {
  stage: ProcessingStage
  errorMessage?: string
}

type StepStatus = "pending" | "active" | "done"

const STEPS: { key: string; label: string }[] = [
  { key: "transcribing", label: "Transcribing audio" },
  { key: "explaining", label: "Writing lecture notes" },
  { key: "finding-books", label: "Finding related books" },
]

const STAGE_PROGRESS: Record<ProcessingStage, number> = {
  idle: 0,
  transcribing: 0,
  explaining: 33,
  "finding-books": 66,
  done: 100,
  error: 0,
}

function stepStatus(stepIndex: number, stage: ProcessingStage): StepStatus {
  const stageOrder = ["transcribing", "explaining", "finding-books", "done"]
  const stageIndex = stageOrder.indexOf(stage)
  if (stageIndex === -1) return "pending"
  if (stepIndex < stageIndex) return "done"
  if (stepIndex === stageIndex) return stage === "done" ? "done" : "active"
  return "pending"
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return <CheckCircle2 className="size-5 shrink-0 text-green-600 dark:text-green-500" />
  }
  if (status === "active") {
    return <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
  }
  return <Circle className="size-5 shrink-0 text-muted-foreground/40" />
}

export function ProcessingStages(props: ProcessingStagesProps) {
  const { stage, errorMessage } = props

  if (stage === "idle") {
    return null
  }

  if (stage === "error") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
        <AlertCircle className="size-5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">
            Something went wrong
          </p>
          <p className="text-sm text-destructive/90">
            {errorMessage ?? "An unexpected error occurred."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <Progress value={STAGE_PROGRESS[stage]} />
      <ol className="space-y-2.5">
        {STEPS.map((step, index) => {
          const status = stepStatus(index, stage)
          return (
            <li key={step.key} className="flex items-center gap-2.5">
              <StepIcon status={status} />
              <span
                className={cn(
                  "text-sm",
                  status === "pending" && "text-muted-foreground",
                  status === "active" && "font-medium text-foreground",
                  status === "done" && "text-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
