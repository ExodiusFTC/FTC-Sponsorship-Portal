import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { VerifyCoachButton } from '@/components/admin/verify-coach-button'
import { PageHeader } from '@/components/page-header'

export default async function CoachesPage() {
  const supabase = await createClient()

  const { data: coaches } = await supabase
    .from('profiles')
    .select('id, full_name, created_at, coach_verified, coach_credentials_url')
    .eq('role', 'coach')
    .order('created_at', { ascending: false })

  const pending  = coaches?.filter(c => !c.coach_verified && c.coach_credentials_url) ?? []
  const verified = coaches?.filter(c =>  c.coach_verified) ?? []
  const waiting  = coaches?.filter(c => !c.coach_verified && !c.coach_credentials_url) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title="Teams"
        subtitle="Verify coaches who have uploaded credentials. Only verified coaches can create teams and pitches."
      />

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Awaiting Verification
          {pending.length > 0 && (
            <span style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', fontSize: '12px', fontWeight: 600, padding: '1px 7px', borderRadius: '9999px' }}>
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', padding: '16px 0' }}>No coaches pending verification.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pending.map(coach => <CoachRow key={coach.id} coach={coach} />)}
          </div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Verified Coaches</h2>
        {verified.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', padding: '16px 0' }}>No verified coaches yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {verified.map(coach => <CoachRow key={coach.id} coach={coach} />)}
          </div>
        )}
      </section>

      {waiting.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-muted)' }}>No Credentials Uploaded</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {waiting.map(coach => <CoachRow key={coach.id} coach={coach} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function CoachRow({
  coach,
}: {
  coach: {
    id: string
    full_name: string | null
    created_at: string
    coach_verified: boolean
    coach_credentials_url: string | null
  }
}) {
  return (
    <Card>
      <CardContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{coach.full_name ?? '(no name)'}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{coach.id}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Joined {new Date(coach.created_at).toLocaleDateString()}
          </p>
          <div style={{ marginTop: '4px' }}>
            {coach.coach_verified ? (
              <span style={{ background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '9999px' }}>
                Verified
              </span>
            ) : (
              <span style={{ border: '1px solid var(--badge-warning-text)', color: 'var(--badge-warning-text)', fontSize: '12px', fontWeight: 500, padding: '2px 8px', borderRadius: '9999px' }}>
                {coach.coach_credentials_url ? 'Credentials uploaded' : 'No credentials'}
              </span>
            )}
          </div>
        </div>
        <VerifyCoachButton coachId={coach.id} verified={coach.coach_verified} />
      </CardContent>
    </Card>
  )
}
