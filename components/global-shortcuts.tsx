'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

export function GlobalShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.shiftKey) {
        const key = e.key.toUpperCase()
        
        switch (key) {
          case 'M':
            e.preventDefault()
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
            break
          case 'Q':
            e.preventDefault()
            router.push('/moderation')
            break
          case 'O':
            e.preventDefault()
            router.push('/dashboard')
            break
          case 'P':
            e.preventDefault()
            router.push('/dashboard?tab=portfolio')
            break
          case 'S':
            e.preventDefault()
            router.push('/dashboard?tab=find-sponsors')
            break
          case 'H':
            e.preventDefault()
            router.push('/dashboard?tab=submissions')
            break
          case 'N':
            e.preventDefault()
            router.push('/dashboard?tab=inbox')
            break
          case 'I':
            e.preventDefault()
            router.push('/dashboard?tab=insights')
            break
          case 'L':
            e.preventDefault()
            router.push('/dashboard?tab=ledger')
            break
          case '<': // Shift + ,
            e.preventDefault()
            router.push('/dashboard?tab=settings')
            break
          case 'D':
            e.preventDefault()
            router.push('/admin')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, pathname, setTheme, resolvedTheme])

  return null
}
