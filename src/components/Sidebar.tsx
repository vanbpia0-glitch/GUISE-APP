import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import {
  IconCalendarMonth,
  IconChartBar,
  IconFlag3,
  IconHome,
  IconRefresh,
  IconSettings,
  IconTargetArrow,
} from '@tabler/icons-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconHome, end: true },
  { to: '/calendar', label: 'Calendar', icon: IconCalendarMonth, end: false },
  { to: '/goals', label: 'Goals', icon: IconTargetArrow, end: false },
  { to: '/systems', label: 'Systems', icon: IconRefresh, end: false },
  { to: '/stats', label: 'Stats', icon: IconChartBar, end: false },
  { to: '/targets', label: 'Targets', icon: IconFlag3, end: false },
];

export default function Sidebar() {
  return (
    <nav className={styles.sidebar} aria-label="Main navigation">
      <NavLink to="/" className={styles.logo} aria-label="Guise home">
        G
      </NavLink>
      <div className={styles.divider} />
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
          aria-label={label}
          title={label}
        >
          <Icon size={19} stroke={1.75} />
        </NavLink>
      ))}
      <div className={styles.spacer} />
      <NavLink
        to="/settings"
        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
        aria-label="Settings"
        title="Settings"
      >
        <IconSettings size={19} stroke={1.75} />
      </NavLink>
    </nav>
  );
}
