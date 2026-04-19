'use client'

import { useEffect, useState } from 'react'
import { Joyride as JoyrideComponent, STATUS } from 'react-joyride'
const Joyride = JoyrideComponent as any
import { useTheme } from 'next-themes'
import type { Step } from 'react-joyride'

const TOUR_STEPS: any[] = [
  {
    target: 'body',
    content: 'Welcome to the Matchmaker Coach Portal! This quick tour will show you around your new workspace.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.tour-overview',
    content: 'Here is your dashboard overview. You can see your active pitches, funding progress, and trackable submission links.',
    placement: 'right',
  },
  {
    target: '.tour-portfolio',
    content: "Your Portfolio is your team's canonical resume. Update your mission statement, media, and achievements once, and reuse it for every pitch.",
    placement: 'right',
  },
  {
    target: '.tour-find-sponsors',
    content: 'Browse our network of verified sponsors. You can filter by industry or funding availability to find the perfect match for your team.',
    placement: 'right',
  },
  {
    target: '.tour-submissions',
    content: 'Track all your outreach here. See which proposals are pending, approved, or need changes.',
    placement: 'right',
  },
  {
    target: '.tour-inbox',
    content: 'All your notifications, including decisions from sponsors and feedback from admins, will appear in your Inbox.',
    placement: 'right',
  },
  {
    target: '.tour-insights',
    content: 'View analytics on how your pitches are performing and identify ways to improve your success rate.',
    placement: 'right',
  },
  {
    target: '.tour-ledger',
    content: 'Manage your budget items here. This keeps your financial ask accurate and transparent for sponsors.',
    placement: 'right',
  },
  {
    target: '.tour-settings',
    content: 'Finally, manage your account settings, email preferences, and password here. You are ready to go!',
    placement: 'right',
  },
]

export function CoachTour() {
  const [run, setRun] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setIsMounted(true)
    const hasSeenTour = localStorage.getItem('matchmaker_coach_tour_completed')
    if (!hasSeenTour) {
      // Small delay to ensure the DOM elements (like sidebar) have fully rendered
      const timer = setTimeout(() => {
        setRun(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleJoyrideCallback = (data: any) => {
    const { status } = data
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

    if (finishedStatuses.includes(status)) {
      setRun(false)
      localStorage.setItem('matchmaker_coach_tour_completed', 'true')
    }
  }

  if (!isMounted) return null

  const isDark = resolvedTheme === 'dark'

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: isDark ? '#18181b' : '#ffffff', // zinc-950 or white
          backgroundColor: isDark ? '#18181b' : '#ffffff',
          overlayColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
          primaryColor: '#4f46e5', // indigo-600
          textColor: isDark ? '#e4e4e7' : '#27272a', // zinc-200 or zinc-800
          zIndex: 1000,
        },
        tooltip: {
          borderRadius: '8px',
          border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7', // zinc-800 or zinc-200
        },
        buttonClose: {
          color: isDark ? '#a1a1aa' : '#71717a',
        },
        buttonNext: {
          backgroundColor: '#4f46e5',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600,
          padding: '8px 16px',
        },
        buttonBack: {
          color: isDark ? '#a1a1aa' : '#71717a',
          fontSize: '13px',
        },
        buttonSkip: {
          color: isDark ? '#a1a1aa' : '#71717a',
          fontSize: '13px',
        }
      } as any}
    />
  )
}
