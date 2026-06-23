import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/actions-utils'
import { htmlToPlainText } from '@/lib/utils'

const CSV_HEADERS = [
  'submission_id',
  'submission_status',
  'submission_created_at',
  'requested_amount_cents',
  'custom_pitch_alignment',
  'specific_needs_statement',
  'team_id',
  'team_name',
  'ftc_team_number',
  'team_state',
  'tax_status',
  'financial_ask_cents',
  'sponsor_id',
  'company_name',
  'contact_name',
  'contact_email',
  'funding_cap_cents',
  'funding_used_cents',
]

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  // CSV formula-injection defense: a cell beginning with = + - @ (or tab/CR) is
  // interpreted as a formula by Excel/Sheets. Prefix with a tab so the spreadsheet
  // treats it as literal text. Field values here are attacker-influenced (team /
  // company names, free-text pitch fields) and admins open this file locally.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `\t${str}`
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowToCsv(row: unknown[]): string {
  return row.map(escapeCell).join(',')
}

export async function GET() {
  let adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient']

  try {
    const auth = await requireAdmin()
    adminClient = auth.adminClient
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: submissions, error } = await adminClient
    .from('submissions')
    .select(`
      id,
      status,
      created_at,
      requested_amount_cents,
      custom_pitch_alignment,
      specific_needs_statement,
      teams:team_id (
        id,
        team_name,
        ftc_team_number,
        state,
        tax_status,
        financial_ask_cents
      ),
      sponsors:sponsor_id (
        id,
        company_name,
        contact_name,
        contact_email,
        funding_cap_cents,
        funding_used_cents
      )
    `)
    .in('status', ['approved', 'dispatched'])

  if (error) {
    console.error('[export] Query failed', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }

  const lines: string[] = [rowToCsv(CSV_HEADERS)]

  for (const s of submissions ?? []) {
    const team = s.teams as unknown as Record<string, unknown> | null
    const sponsor = s.sponsors as unknown as Record<string, unknown> | null

    lines.push(
      rowToCsv([
        s.id,
        s.status,
        s.created_at,
        s.requested_amount_cents,
        htmlToPlainText(s.custom_pitch_alignment),
        htmlToPlainText(s.specific_needs_statement),
        team?.id,
        team?.team_name,
        team?.ftc_team_number,
        team?.state,
        team?.tax_status,
        team?.financial_ask_cents,
        sponsor?.id,
        sponsor?.company_name,
        sponsor?.contact_name,
        sponsor?.contact_email,
        sponsor?.funding_cap_cents,
        sponsor?.funding_used_cents,
      ])
    )
  }

  const csv = lines.join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="sponsorship_export_2026.csv"',
    },
  })
}
