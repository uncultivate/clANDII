import { NavLink, Outlet } from 'react-router-dom'
import { useAppShell } from '../AppShellContext.tsx'
import '../styles/app-layout.css'

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="alIcon">{children}</span>
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TerminalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16v14H4V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 10l3 2-3 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AppLayout() {
  const { shellVisible } = useAppShell()

  if (!shellVisible) {
    return <Outlet />
  }

  return (
    <div className="alShell">
      <aside className="alSidebar" aria-label="Sidebar">
        <div className="alBrand">
          <div className="alBrandMark">
            <img className="alBrandMarkImg" src="/favicon.svg" width={44} height={44} alt="" />
          </div>
          <div className="alBrandText">clANDII</div>
        </div>

        <nav className="alNav">
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? 'alNavItem isActive' : 'alNavItem')}
          >
            <Icon>
              <HomeIcon />
            </Icon>
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/cli"
            className={({ isActive }) => (isActive ? 'alNavItem isActive' : 'alNavItem')}
          >
            <Icon>
              <TerminalIcon />
            </Icon>
            <span>CLI</span>
          </NavLink>
        </nav>
      </aside>

      <div className="alContent">
        <header className="alHeader">
          <div className="alHeaderTitle">clANDII ICT Solution</div>
          <div className="alHeaderSubtitle">
            Always follow your Responsible Use of ABS Microdata obligations
          </div>
        </header>

        <main className="alMain">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
