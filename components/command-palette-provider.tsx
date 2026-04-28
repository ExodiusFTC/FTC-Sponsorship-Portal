'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlobalCommandPalette } from './global-command-palette'

export function CommandPaletteProvider() {
  const [role, setRole] = useState<'coach' | 'admin' | 'sponsor' | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.role) setRole(data.role as 'coach' | 'admin' | 'sponsor')
        })
    })
  }, [])

  return <GlobalCommandPalette role={role} />
}
