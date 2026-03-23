import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShellProvider } from './AppShellContext.tsx'
import AppLayout from './components/AppLayout.tsx'
import HomePage from './pages/HomePage.tsx'
import CLIPage from './pages/CLIPage.tsx'

export default function App() {
  return (
    <AppShellProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/cli" element={<CLIPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppShellProvider>
  )
}

