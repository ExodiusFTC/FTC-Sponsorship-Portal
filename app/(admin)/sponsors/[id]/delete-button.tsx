'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { deleteSponsor } from '@/app/actions/sponsor'

export function DeleteButton({ sponsorId, sponsorName }: { sponsorId: string; sponsorName: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteSponsor(sponsorId)
      if (res.error) {
        alert(res.error) // simple fallback since toast isn't available/specified
      } else {
        router.push('/sponsors')
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger 
        className={buttonVariants({ variant: 'destructive' })} 
        disabled={isPending}
      >
        {isPending ? 'Deleting...' : 'Delete sponsor'}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {sponsorName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action is irreversible. The sponsor will be removed immediately. 
            An audit log record will be kept for compliance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isPending}>
            Confirm Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
