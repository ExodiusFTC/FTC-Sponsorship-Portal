'use client'

import { useEffect, useRef, useCallback } from 'react'

const SPACING = 26
const DOT_R = 1.6
// idle: ~16% of dots are on at any moment
const IDLE_ON_PROB = 0.16
const IDLE_ALPHA_MAX = 0.20    // how opaque idle dots are
const IDLE_LERP = 0.025        // how fast dots fade in/out in idle
const CLICK_RADIUS = 90        // px around click that lights up
const CLICK_ALPHA = 0.55       // how bright the clicked dots appear
const SCATTER_STRENGTH = 5.5
const FRICTION = 0.87
const SPRING = 0.055

interface Dot {
  ox: number          // grid origin
  oy: number
  x: number           // current position (moves on scatter)
  y: number
  vx: number
  vy: number
  alpha: number       // current rendered opacity
  idleAlpha: number   // target idle opacity (0 = off, or IDLE_ALPHA_MAX)
  nextFlicker: number // timestamp when this dot next toggles idle state
}

function makeDots(w: number, h: number, now: number): Dot[] {
  const dots: Dot[] = []
  const startX = (w % SPACING) / 2
  const startY = (h % SPACING) / 2
  const cols = Math.floor(w / SPACING) + 2
  const rows = Math.floor(h / SPACING) + 2

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * SPACING
      const y = startY + r * SPACING
      const on = Math.random() < IDLE_ON_PROB
      dots.push({
        ox: x, oy: y, x, y,
        vx: 0, vy: 0,
        alpha: on ? Math.random() * IDLE_ALPHA_MAX : 0,
        idleAlpha: on ? IDLE_ALPHA_MAX * (0.5 + Math.random() * 0.5) : 0,
        // stagger so dots don't all flicker in sync
        nextFlicker: now + Math.random() * 5000,
      })
    }
  }
  return dots
}

export function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const rafRef = useRef<number>(0)
  const dimRef = useRef({ w: 0, h: 0 })

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    dimRef.current = { w, h }
    dotsRef.current = makeDots(w, h, performance.now())
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    resize()

    function tick() {
      const now = performance.now()
      const { w, h } = dimRef.current
      const dpr = window.devicePixelRatio || 1

      ctx!.clearRect(0, 0, w * dpr, h * dpr)
      ctx!.save()
      ctx!.scale(dpr, dpr)

      for (const d of dotsRef.current) {
        // — idle flicker —
        if (now >= d.nextFlicker) {
          const goOn = Math.random() < IDLE_ON_PROB
          d.idleAlpha = goOn ? IDLE_ALPHA_MAX * (0.5 + Math.random() * 0.5) : 0
          d.nextFlicker = now + 800 + Math.random() * 4200
        }

        // — spring physics back to origin —
        d.vx += (d.ox - d.x) * SPRING
        d.vy += (d.oy - d.y) * SPRING
        d.vx *= FRICTION
        d.vy *= FRICTION
        d.x += d.vx
        d.y += d.vy

        // — fade alpha toward idle target —
        d.alpha += (d.idleAlpha - d.alpha) * IDLE_LERP

        if (d.alpha < 0.01) continue

        ctx!.beginPath()
        ctx!.arc(d.x, d.y, DOT_R, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(24,24,27,${d.alpha.toFixed(3)})`
        ctx!.fill()
      }

      ctx!.restore()
      rafRef.current = requestAnimationFrame(tick)
    }

    tick()

    function handleClick(e: MouseEvent) {
      const mx = e.clientX
      const my = e.clientY

      for (const d of dotsRef.current) {
        const dx = d.ox - mx
        const dy = d.oy - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist >= CLICK_RADIUS || dist === 0) continue

        const t = 1 - dist / CLICK_RADIUS
        // Reveal dot at full brightness
        d.alpha = CLICK_ALPHA * t
        // Scatter outward from click point
        const force = t * SCATTER_STRENGTH
        const angle = Math.atan2(dy, dx)
        const jitter = 0.65 + Math.random() * 0.7
        d.vx += Math.cos(angle) * force * jitter
        d.vy += Math.sin(angle) * force * jitter
      }
    }

    window.addEventListener('click', handleClick, true)
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('click', handleClick, true)
      window.removeEventListener('resize', resize)
    }
  }, [resize])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      suppressHydrationWarning
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  )
}
