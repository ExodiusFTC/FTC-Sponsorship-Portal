'use client'

import { useEffect, useRef } from 'react'

const GEAR_SIZE = 28
const RING_SIZE = 52
const SPAWN_INTERVAL_MS = 50
const RING_DURATION_MS = 750

function spawnHexRing(x: number, y: number) {
  const el = document.createElement('div')
  el.style.cssText = `
    position:fixed;
    top:0;
    left:0;
    width:${RING_SIZE}px;
    height:${RING_SIZE}px;
    pointer-events:none;
    z-index:99997;
    --hx:${x - RING_SIZE / 2}px;
    --hy:${y - RING_SIZE / 2}px;
    animation:hexRipple ${RING_DURATION_MS}ms ease-out forwards;
  `
  el.innerHTML = `<svg width="${RING_SIZE}" height="${RING_SIZE}" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <polygon points="26,2 50,15 50,37 26,50 2,37 2,15"
      fill="none"
      stroke="rgba(192,192,192,0.65)"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
  </svg>`
  document.body.appendChild(el)
  el.addEventListener('animationend', () => el.remove(), { once: true })
}

export function RoboticsCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const lastSpawnRef = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return

    const styleEl = document.createElement('style')
    styleEl.textContent = `
      @keyframes robotGearSpin {
        to { transform: rotate(360deg); }
      }
      @keyframes hexRipple {
        from {
          transform: translate(var(--hx), var(--hy)) scale(0.12);
          opacity: 0.7;
        }
        to {
          transform: translate(var(--hx), var(--hy)) scale(1);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(styleEl)
    document.body.style.cursor = 'none'

    let x = -999
    let y = -999
    let visible = false
    let rafId = 0
    let pending = false

    const render = () => {
      pending = false
      const el = cursorRef.current
      if (!el) return
      el.style.transform = `translate(${x - GEAR_SIZE / 2}px, ${y - GEAR_SIZE / 2}px)`
      el.style.opacity = visible ? '1' : '0'
    }

    const schedule = () => {
      if (pending) return
      pending = true
      rafId = requestAnimationFrame(render)
    }

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      visible = true
      schedule()

      const now = e.timeStamp
      if (now - lastSpawnRef.current >= SPAWN_INTERVAL_MS) {
        lastSpawnRef.current = now
        spawnHexRing(x, y)
      }
    }

    // Hide the gear when the pointer leaves the viewport so it doesn't freeze
    // stranded on an edge; it reappears on the next move back inside.
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget === null) {
        visible = false
        schedule()
      }
    }

    const onBlur = () => {
      visible = false
      schedule()
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseout', onLeave)
    window.addEventListener('blur', onBlur)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseout', onLeave)
      window.removeEventListener('blur', onBlur)
      document.body.style.cursor = ''
      styleEl.remove()
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: GEAR_SIZE,
        height: GEAR_SIZE,
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: 0,
        transform: 'translate(-999px,-999px)',
        willChange: 'transform',
      }}
    >
      <svg
        width={GEAR_SIZE}
        height={GEAR_SIZE}
        viewBox="0 0 24 24"
        style={{ animation: 'robotGearSpin 3s linear infinite', display: 'block' }}
        aria-hidden="true"
      >
        <path
          fill="#434343ff"
          d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.95C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.95L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"
        />
      </svg>
    </div>
  )
}
