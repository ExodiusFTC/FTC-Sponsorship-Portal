import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VerifyCoachButton } from '@/components/admin/verify-coach-button'

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
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Coach Accounts</h1>
        <p className="text-muted-foreground">
          Verify coaches who have uploaded credentials. Only verified coaches can create teams and pitches.
        </p>
      </div>

      {/* Pending verification */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Awaiting Verification
          {pending.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{pending.length}</Badge>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No coaches pending verification.</p>
        ) : (
          <div className="space-y-2">
            {pending.map(coach => (
              <CoachRow key={coach.id} coach={coach} />
            ))}
          </div>
        )}
      </section>

      {/* Verified */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Verified Coaches</h2>
        {verified.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No verified coaches yet.</p>
        ) : (
          <div className="space-y-2">
            {verified.map(coach => (
              <CoachRow key={coach.id} coach={coach} />
            ))}
          </div>
        )}
      </section>

      {/* Awaiting credentials */}
      {waiting.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">No Credentials Uploaded</h2>
          <div className="space-y-2">
            {waiting.map(coach => (
              <CoachRow key={coach.id} coach={coach} />
            ))}
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
      <CardContent className="flex items-center justify-between py-4">
        <div className="space-y-0.5">
          <p className="font-medium">{coach.full_name ?? '(no name)'}</p>
          <p className="text-xs text-muted-foreground font-mono">{coach.id}</p>
          <p className="text-xs text-muted-foreground">
            Joined {new Date(coach.created_at).toLocaleDateString()}
          </p>
          <div className="flex gap-2 mt-1">
            {coach.coach_verified ? (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Verified</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-400">
                {coach.coach_credentials_url ? 'Credentials uploaded' : 'No credentials'}
              </Badge>
            )}
          </div>
        </div>
        <VerifyCoachButton coachId={coach.id} verified={coach.coach_verified} />
      </CardContent>
    </Card>
  )
}
