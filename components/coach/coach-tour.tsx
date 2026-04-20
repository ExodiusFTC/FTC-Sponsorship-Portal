'use client'

import { useEffect, useState } from 'react'
import { Joyride as JoyrideComponent, STATUS } from 'react-joyride'
const Joyride = JoyrideComponent as any
import { useTheme } from 'next-themes'

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
    content: "Your Portfolio is your team's primary resume. Update your mission statement, media, and achievements once, and reuse it for every pitch.",
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

export function CoachTour({ profile }: { profile: any }) {
  const [run, setRun] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  const tourKey = `matchmaker_tour_${profile?.id || 'guest'}`

  // 1. Handle mounting separately to avoid hydration/render mismatches
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 2. Handle tour logic separately with stable dependencies
  useEffect(() => {
    if (!isMounted) return

    const hasSeenTour = localStorage.getItem(tourKey)
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setRun(true)
      }, 1500)
      return () => clearTimeout(timer)
    } else {
      setRun(false)
    }
  }, [isMounted, tourKey])

  const handleJoyrideCallback = (data: any) => {
    const { status, type } = data
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

    if (finishedStatuses.includes(status) || type === 'tour:end') {
      setRun(false)
      localStorage.setItem(tourKey, 'true')
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
      locale={{ skip: 'Skip Tour' }}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: isDark ? '#18181b' : '#ffffff',
          backgroundColor: isDark ? '#18181b' : '#ffffff',
          overlayColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.5)',
          primaryColor: '#6366f1',
          textColor: isDark ? '#f4f4f5' : '#18181b',
          zIndex: 1000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        },
        tooltipContent: {
          padding: '10px 0',
          fontSize: '15px',
          lineHeight: '1.6',
        },
        buttonClose: {
          color: isDark ? '#a1a1aa' : '#71717a',
        },
        buttonNext: {
          backgroundColor: '#6366f1',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          padding: '10px 20px',
        },
        buttonBack: {
          color: isDark ? '#a1a1aa' : '#71717a',
          fontSize: '14px',
          marginRight: '12px',
        },
        buttonSkip: {
          color: isDark ? '#a1a1aa' : '#71717a',
          fontSize: '14px',
          fontWeight: 500,
        }
      } as any}
    />
  )
}
