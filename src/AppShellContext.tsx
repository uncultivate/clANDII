import { createContext, useContext, useState } from 'react'

type AppShellContextValue = {
  shellVisible: boolean
  setShellVisible: (visible: boolean) => void
  systemDestroyed: boolean
  setSystemDestroyed: (destroyed: boolean) => void
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [shellVisible, setShellVisible] = useState(true)
  const [systemDestroyed, setSystemDestroyed] = useState(false)

  return (
    <AppShellContext.Provider
      value={{ shellVisible, setShellVisible, systemDestroyed, setSystemDestroyed }}
    >
      {children}
    </AppShellContext.Provider>
  )
}

export function useAppShell() {
  const context = useContext(AppShellContext)
  if (!context) {
    throw new Error('useAppShell must be used within AppShellProvider')
  }
  return context
}
