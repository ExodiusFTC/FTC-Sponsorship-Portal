'use client'

export default function CoachError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
      <button
        onClick={reset}
        className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
      >
        Try again
      </button>
    </div>
  )
}
