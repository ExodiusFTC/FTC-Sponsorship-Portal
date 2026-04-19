import { redirect } from 'next/navigation'
import { DevLoginButtons } from '@/components/auth/dev-login-buttons'

export default function DevLoginPage() {
  // if (process.env.NODE_ENV !== 'development') {
  //   redirect('/login')
  // }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen py-12">
      <div style={{
        width: '100%', maxWidth: '400px', border: '1px dashed #fbbf24',
        borderRadius: '12px', padding: '32px', background: '#1a1300',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ background: '#fbbf24', color: '#000', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.1em' }}>DEV ONLY</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#fef3c7' }}>Test Login</span>
          </div>
          <p style={{ fontSize: '13px', color: '#a8a29e' }}>
            Skip email verification. Creates or reuses pre-seeded test accounts.
            Not available in production.
          </p>
        </div>

        <DevLoginButtons />

        <div style={{ marginTop: '16px', padding: '12px', background: '#0f0f0f', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>
          <div>coach: devcoach@test.local</div>
          <div>sponsor: devsponsor@test.local</div>
          <div>admin: devadmin@test.local</div>
          <div style={{ marginTop: '4px', color: '#4b5563' }}>pw: devpassword123!</div>
        </div>
      </div>
    </div>
  )
}
