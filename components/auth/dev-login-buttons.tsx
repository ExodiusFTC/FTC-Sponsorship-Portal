'use client'

import { useState, useTransition } from 'react'
import { devSignIn } from '@/app/actions/dev-auth'

export function DevLoginButtons() {
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [active, setActive] = useState<'coach' | 'admin' | null>(null)

  function login(role: 'coach' | 'admin') {
    setError(''); setActive(role)
    startTransition(async () => {
      const res = await devSignIn(role)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button
        onClick={() => login('coach')}
        disabled={isPending}
        style={{
          padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
          cursor: isPending ? 'not-allowed' : 'pointer', border: '1px solid #374151',
          background: active === 'coach' && isPending ? '#111' : '#18181b',
          color: '#d4d4d8', transition: 'background 0.15s',
        }}
      >
        {isPending && active === 'coach' ? 'Signing in…' : '🧑‍🏫 Login as Test Coach'}
      </button>
      <button
        onClick={() => login('admin')}
        disabled={isPending}
        style={{
          padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
          cursor: isPending ? 'not-allowed' : 'pointer', border: '1px solid #374151',
          background: active === 'admin' && isPending ? '#111' : '#18181b',
          color: '#d4d4d8', transition: 'background 0.15s',
        }}
      >
        {isPending && active === 'admin' ? 'Signing in…' : '🛡 Login as Test Admin'}
      </button>
      {error && <p style={{ fontSize: '13px', color: '#f87171', marginTop: '4px' }}>{error}</p>}
    </div>
  )
}
