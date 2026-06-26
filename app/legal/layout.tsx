import { DotGrid } from '@/components/ui/dot-grid'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen">
      <DotGrid />
      {children}
    </div>
  )
}
