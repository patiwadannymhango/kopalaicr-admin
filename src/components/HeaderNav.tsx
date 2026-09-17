import { NavLink } from 'react-router-dom';

export default function HeaderNav() {
  return (
    <nav className="nav-tabs">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
        Registrations
      </NavLink>
      <NavLink to="/teams" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
        Teams
      </NavLink>
    </nav>
  );
}
