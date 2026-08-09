'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRequireAuth } from '@/lib/useRequireAuth';
import styles from './dashboard.module.css';

const TABS = [
  { href: '/dashboard', label: 'My properties' },
  { href: '/dashboard/properties/new', label: 'Add a property' },
  { href: '/dashboard/leads', label: 'Leads' },
];

export default function DashboardLayout({ children }) {
  const { ready, owner } = useRequireAuth();
  const pathname = usePathname();

  if (!ready) {
    return (
      <div className="container">
        <p className={styles.loading}>Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Owner dashboard</h1>
          <p className={styles.sub}>Signed in as {owner?.name}</p>
        </div>
      </div>

      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${pathname === tab.href ? styles.tabActive : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="trail-divider" role="presentation" />

      {children}
    </div>
  );
}
