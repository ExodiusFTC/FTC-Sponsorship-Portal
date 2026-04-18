import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SubmissionRejectionSummaryProps {
  submission: {
    id: string
    sponsor_name: string
    status: string // 'draft' | 'pending' | 'approved' | 'declined' | 'changes_requested'
    admin_feedback?: string | null
    updated_at: string
  }
}

export function SubmissionRejectionSummary({ submission }: SubmissionRejectionSummaryProps) {
  if (
    (submission.status !== 'declined' && submission.status !== 'changes_requested') ||
    !submission.admin_feedback
  ) {
    return null
  }

  const isChangesRequested = submission.status === 'changes_requested'

  return (
    <Card
      className={
        isChangesRequested
          ? 'border-amber-300 bg-amber-50'
          : 'border-destructive/40 bg-destructive/5'
      }
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">
          Feedback on submission to &ldquo;{submission.sponsor_name}&rdquo;
        </CardTitle>
        <Badge variant={isChangesRequested ? 'outline' : 'destructive'}>
          {isChangesRequested ? 'Changes Requested' : 'Declined'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm whitespace-pre-wrap">{submission.admin_feedback}</p>
        <div className="text-sm">
          <Link href={`/submissions/${submission.id}/edit`}>
            <Button variant={isChangesRequested ? 'default' : 'secondary'} size="sm">
              Edit Submission
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
