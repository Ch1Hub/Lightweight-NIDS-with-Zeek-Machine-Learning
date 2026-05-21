import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',         label: 'Dashboard',       icon: '◉' },
  { to: '/offline',  label: 'Offline Analysis', icon: '⬆' },
  { to: '/live',     label: 'Live Capture',     icon: '◉' },
  { to: '/alerts',   label: 'Alert History',   icon: '⚠' },
  { to: '/models',   label: 'Model Info',       icon: '⚙' },
]

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        2CSCys <span>NIDS Dashboard</span>
      </div>
      {links.map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
