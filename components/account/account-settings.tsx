'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProfile, updatePassword, deleteAccount } from '@/app/actions/account'

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: '16px' }}>{title}</CardTitle>
        {sub && <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '14px',
  border: '1px solid var(--border-color)', borderRadius: '6px',
  background: 'var(--bg-elevated)', color: 'var(--text-primary)', outline: 'none',
}

const btnStyle = (variant: 'primary' | 'danger' | 'secondary'): React.CSSProperties => ({
  padding: '8px 16px', fontSize: '14px', fontWeight: 500, borderRadius: '6px',
  cursor: 'pointer', transition: 'opacity 0.15s',
  background: variant === 'primary' ? 'var(--text-primary)' : variant === 'danger' ? '#dc2626' : 'var(--bg-elevated)',
  color: variant === 'primary' ? 'var(--bg-surface)' : variant === 'danger' ? '#fff' : 'var(--text-secondary)',
  border: variant === 'secondary' ? '1px solid var(--border-color)' : 'none',
})

export function AccountSettings({
  currentName,
  email,
  role,
}: {
  currentName: string
  email: string
  role: string
}) {
  const [fullName, setFullName] = useState(currentName)
  const [nameStatus, setNameStatus] = useState('')
  const [nameError, setNameError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [pwStatus, setPwStatus] = useState('')
  const [pwError, setPwError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const [isPending, startTransition] = useTransition()

  function handleProfileSave() {
    setNameStatus(''); setNameError('')
    startTransition(async () => {
      const res = await updateProfile({ fullName })
      if (res?.error) setNameError(res.error)
      else setNameStatus('Name updated successfully.')
    })
  }

  function handlePasswordSave() {
    setPwStatus(''); setPwError('')
    startTransition(async () => {
      const res = await updatePassword({ password: newPassword })
      if (res?.error) setPwError(res.error)
      else { setPwStatus('Password updated.'); setNewPassword('') }
    })
  }

  function handleDelete() {
    if (confirmDelete !== email) {
      setDeleteError('Type your email exactly to confirm deletion.')
      return
    }
    setDeleteError('')
    startTransition(async () => {
      const res = await deleteAccount()
      if (res?.error) setDeleteError(res.error)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
      {/* Profile */}
      <Section title="Profile" sub="Your public display name.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="Full name">
            <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} />
          </Field>
          <Field label="Email address">
            <input style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} value={email} disabled />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email changes require contacting support.</p>
          </Field>
          <Field label="Role">
            <input style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} value={role} disabled />
          </Field>
          {nameStatus && <p style={{ fontSize: '13px', color: '#34d399' }}>{nameStatus}</p>}
          {nameError && <p style={{ fontSize: '13px', color: '#f87171' }}>{nameError}</p>}
          <button style={btnStyle('primary')} onClick={handleProfileSave} disabled={isPending}>
            Save profile
          </button>
        </div>
      </Section>

      {/* Password */}
      <Section title="Change Password" sub="Use a strong password of at least 8 characters.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="New password">
            <input
              style={inputStyle} type="password"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </Field>
          {pwStatus && <p style={{ fontSize: '13px', color: '#34d399' }}>{pwStatus}</p>}
          {pwError && <p style={{ fontSize: '13px', color: '#f87171' }}>{pwError}</p>}
          <button style={btnStyle('primary')} onClick={handlePasswordSave} disabled={isPending || newPassword.length < 8}>
            Update password
          </button>
        </div>
      </Section>

      {/* Delete account */}
      <Section title="Delete Account" sub="This is permanent. All your data will be removed and cannot be recovered.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            To confirm, type your email address: <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
          </p>
          <Field label="Confirm email">
            <input
              style={{ ...inputStyle, borderColor: confirmDelete && confirmDelete !== email ? '#f87171' : 'var(--border-color)' }}
              value={confirmDelete}
              onChange={e => setConfirmDelete(e.target.value)}
              placeholder={email}
            />
          </Field>
          {deleteError && <p style={{ fontSize: '13px', color: '#f87171' }}>{deleteError}</p>}
          <button
            style={btnStyle('danger')}
            onClick={handleDelete}
            disabled={isPending || confirmDelete !== email}
          >
            Permanently delete account
          </button>
        </div>
      </Section>
    </div>
  )
}
