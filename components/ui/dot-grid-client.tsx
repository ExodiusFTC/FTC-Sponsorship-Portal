'use client'

import dynamic from 'next/dynamic'

const DotGridCanvas = dynamic(
  () => import('./dot-grid').then((m) => m.DotGrid),
  { ssr: false }
)

export function DotGridClient() {
  return <DotGridCanvas />
}
