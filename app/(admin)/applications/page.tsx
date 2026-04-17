import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ApplicationActions } from '@/components/admin/application-actions'

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}

export default async function ApplicationsPage() {
  const supabase = await createClient()

  const { data: applications } = await supabase
    .from('sponsor_applications')
    .select('*')
    .order('created_at', { ascending: false })

  const pending  = applications?.filter(a => a.status === 'pending') ?? []
  const reviewed = applications?.filter(a => a.status !== 'pending') ?? []

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Sponsor Applications</h1>
        <p className="text-muted-foreground">
          Companies who applied via the public form. Approve to add them to the sponsor directory.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Pending Review
          {pending.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{pending.length}</Badge>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No pending applications.</p>
        ) : (
          <div className="space-y-3">
            {pending.map(app => (
              <Card key={app.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{app.company_name}</CardTitle>
                      <CardDescription>
                        {app.contact_email} · Applied {new Date(app.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={STATUS_STYLE[app.status] ?? 'bg-muted'}>
                      {app.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Proposed Cap</p>
                      <p className="font-medium">
                        ${(app.proposed_cap_cents / 100).toLocaleString('en-US')}
                      </p>
                    </div>
                  </div>
                  {app.message && (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded p-3">
                      {app.message}
                    </p>
                  )}
                  <div className="flex justify-end pt-1">
                    <ApplicationActions applicationId={app.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {reviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Reviewed</h2>
          <div className="space-y-2">
            {reviewed.map(app => (
              <div key={app.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <p className="font-medium text-sm">{app.company_name}</p>
                  <p className="text-xs text-muted-foreground">{app.contact_email}</p>
                </div>
                <Badge className={STATUS_STYLE[app.status] ?? 'bg-muted'}>{app.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
