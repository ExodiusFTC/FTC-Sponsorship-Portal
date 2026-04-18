'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CardFooter } from '@/components/ui/card'
import { requestEdit, declineSubmission, approveSubmission } from '@/app/actions/moderation'

export function ModerationActions({ submissionId }: { submissionId: string }) {
  const [editOpen, setEditOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleRequestEdit = () => {
    startTransition(async () => {
      await requestEdit(submissionId, feedback)
      setEditOpen(false)
      setFeedback('')
    })
  }

  const handleDecline = () => {
    startTransition(async () => {
      await declineSubmission(submissionId, feedback)
      setDeclineOpen(false)
      setFeedback('')
    })
  }

  const handleApprove = () => {
    startTransition(async () => {
      await approveSubmission(submissionId)
    })
  }

  const Trigger = DialogTrigger as any

  return (
    <CardFooter className="flex justify-end gap-3 border-t pt-4">
      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open)
        if (!open) setFeedback('')
      }}>
        <Trigger asChild>
          <Button variant="outline" disabled={isPending}>Request Edit</Button>
        </Trigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Edit</DialogTitle>
            <DialogDescription>
              Provide specific feedback to the team about what needs to be changed before approval.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Please clarify the line items and provide more detail."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleRequestEdit} disabled={!feedback.trim() || isPending}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={(open) => {
        setDeclineOpen(open)
        if (!open) setFeedback('')
      }}>
        <Trigger asChild>
          <Button variant="destructive" disabled={isPending}>Decline</Button>
        </Trigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Submission</DialogTitle>
            <DialogDescription>
              Provide reasoning for why this submission is being declined. The team will be able to see this feedback.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Does not meet sponsorship criteria at this time."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={!feedback.trim() || isPending}>
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="default" onClick={handleApprove} disabled={isPending}>
        {isPending ? 'Processing...' : 'Approve & Dispatch to Sponsor'}
      </Button>
    </CardFooter>
  )
}
