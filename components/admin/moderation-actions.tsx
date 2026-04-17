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
import { requestEdit, rejectPitch, approvePitch } from '@/app/actions/moderation'

export function ModerationActions({ pitchId }: { pitchId: string }) {
  const [editOpen, setEditOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleRequestEdit = () => {
    startTransition(async () => {
      await requestEdit(pitchId, feedback)
      setEditOpen(false)
      setFeedback('')
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      await rejectPitch(pitchId, feedback)
      setRejectOpen(false)
      setFeedback('')
    })
  }

  const handleApprove = () => {
    startTransition(async () => {
      await approvePitch(pitchId)
    })
  }

  return (
    <CardFooter className="flex justify-end gap-3 border-t pt-4">
      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open)
        if (!open) setFeedback('')
      }}>
        <DialogTrigger render={<Button variant="outline" disabled={isPending} />}>
          Request Edit
        </DialogTrigger>
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

      <Dialog open={rejectOpen} onOpenChange={(open) => {
        setRejectOpen(open)
        if (!open) setFeedback('')
      }}>
        <DialogTrigger render={<Button variant="destructive" disabled={isPending} />}>
          Reject
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Pitch</DialogTitle>
            <DialogDescription>
              Provide reasoning for why this pitch is being rejected. The team will be able to see this feedback.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Does not meet sponsorship criteria at this time."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!feedback.trim() || isPending}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="default" onClick={handleApprove} disabled={isPending}>
        {isPending ? 'Processing...' : 'Approve & Queue Dispatch'}
      </Button>
    </CardFooter>
  )
}
