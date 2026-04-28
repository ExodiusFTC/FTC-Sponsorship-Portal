import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { AuditLogTable } from '@/components/admin/audit-log-table'

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/login')
  }

  const { action: filterAction, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const pageSize = 50
  const offset = (page - 1) * pageSize

  const adminClient = createAdminClient()

  let query = adminClient
    .from('audit_log')
    .select('*, actor:actor_id(full_name, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (filterAction) {
    query = query.eq('action', filterAction) as typeof query
  }

  const { data: logs, count } = await query

  // Distinct action values for the filter dropdown
  const { data: actions } = await adminClient
    .from('audit_log')
    .select('action')
    .order('action')

  const uniqueActions = [...new Set((actions ?? []).map((a) => a.action))].sort()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Log"
        subtitle={`${count ?? 0} events recorded`}
      />
      <AuditLogTable
        logs={(logs ?? []) as any}
        uniqueActions={uniqueActions}
        currentAction={filterAction}
        page={page}
        pageSize={pageSize}
        total={count ?? 0}
      />
    </div>
  )
}
