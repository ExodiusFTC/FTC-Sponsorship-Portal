import { DotGrid } from '@/components/ui/dot-grid'

export default function SponsorsPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen">
      <DotGrid />
      {children}
    </div>
  )
}
