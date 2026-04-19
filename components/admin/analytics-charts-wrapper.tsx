'use client'

import dynamic from 'next/dynamic'

const AnalyticsCharts = dynamic(() => import('./analytics-charts'), { ssr: false })

export function AnalyticsChartsWrapper() {
  return <AnalyticsCharts />
}
