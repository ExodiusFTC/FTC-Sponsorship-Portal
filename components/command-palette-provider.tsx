'use client'

import { useUser } from '@clerk/nextjs'
import { GlobalCommandPalette } from './global-command-palette'

// DEV-ONLY coach preview (see lib/dev-coach-preview.ts). Inlined at build; off in prod.
const COACH_PREVIEW =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_COACH_PREVIEW === '1'

export function CommandPaletteProvider() {
  const { user } = useUser()
  const role = COACH_PREVIEW
    ? 'coach'
    : ((user?.publicMetadata?.role as 'coach' | 'admin' | 'sponsor' | undefined) ?? null)

  return <GlobalCommandPalette role={role} />
}
