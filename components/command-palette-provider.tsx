'use client'

import { useUser } from '@clerk/nextjs'
import { GlobalCommandPalette } from './global-command-palette'

export function CommandPaletteProvider() {
  const { user } = useUser()
  const role = (user?.publicMetadata?.role as 'coach' | 'admin' | 'sponsor' | undefined) ?? null

  return <GlobalCommandPalette role={role} />
}
