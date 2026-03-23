import { useMemo } from 'react'
import { useAppShell } from '../AppShellContext.tsx'
import BashCli from '../cli/BashCli.tsx'
import { createMockCliSimulator } from '../cli/cliSimulator.ts'

export default function CLIPage() {
  const simulator = useMemo(() => createMockCliSimulator(), [])
  const { setShellVisible, systemDestroyed, setSystemDestroyed } = useAppShell()

  if (systemDestroyed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#ffffff',
          color: '#000000',
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            background: '#4b4b59',
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 700,
            padding: '3px 6px 5px',
            lineHeight: 1.35,
          }}
        >
          Server Error
        </div>

        <div style={{ padding: '16px 15px' }}>
          <div
            style={{
              border: '1px solid #d7d7d7',
              padding: '10px 16px 11px',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: '#c00000',
                marginBottom: 10,
              }}
            >
              404 - File or directory not found.
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#111111',
                lineHeight: 1.4,
              }}
            >
              The resource you are looking for might have been removed, had its name
              changed, or is temporarily unavailable.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 10 }}>
      <h2 style={{ margin: 0 }}>CLI</h2>
      <div style={{ height: 16 }} />
      <BashCli
        simulator={simulator}
        onSystemDestroyed={() => {
          setShellVisible(false)
          setSystemDestroyed(true)
        }}
      />
    </div>
  )
}
