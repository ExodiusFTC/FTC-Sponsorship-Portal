import { Sidebar } from './sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-app)',
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 48px',
          marginLeft: '240px',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
          }}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
