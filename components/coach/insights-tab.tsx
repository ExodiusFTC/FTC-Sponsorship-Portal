'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export function InsightsTab({ submissions }: { submissions: any[] }) {
  const totalFunded = submissions.filter(s => s.status === 'approved').reduce((acc, s) => acc + (s.financial_ask_cents || 0), 0)
  const approvedCount = submissions.filter(s => s.status === 'approved').length
  const declinedCount = submissions.filter(s => s.status === 'declined').length
  const acceptanceRate = approvedCount + declinedCount === 0 ? 0 : Math.round((approvedCount / (approvedCount + declinedCount)) * 100)

  const monthlyDataMap = submissions.reduce((acc, s) => {
    const month = new Date(s.created_at).toLocaleString('default', { month: 'short' })
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const monthlyData = Object.entries(monthlyDataMap).map(([name, count]) => ({ name, count }))

  const statusDataMap = submissions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const statusData = Object.entries(statusDataMap).map(([name, value]) => ({ name, value }))
  
  const COLORS = { approved: '#10b981', declined: '#ef4444', changes_requested: '#eab308', pending: '#64748b' }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">Total Funded</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">${(totalFunded / 100).toFixed(2)}</div>
        </div>
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">Acceptance Rate</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{acceptanceRate}%</div>
        </div>
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">Avg Response Time</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">—</div>
        </div>
      </div>
      
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60">
           <h3 className="text-sm font-medium text-zinc-100 mb-6">Submissions Over Time</h3>
           <div className="h-[280px]">
             {monthlyData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyData}>
                   <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => Math.floor(val).toString()} />
                   <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#e4e4e7' }} />
                   <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={48} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-sm text-zinc-500">No data available</div>
             )}
           </div>
        </div>
        
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60">
           <h3 className="text-sm font-medium text-zinc-100 mb-6">Outcome Breakdown</h3>
           <div className="h-[280px]">
             {statusData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value">
                     {statusData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#52525b'} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#e4e4e7' }} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-sm text-zinc-500">No data available</div>
             )}
           </div>
        </div>
      </div>
    </div>
  )
}
