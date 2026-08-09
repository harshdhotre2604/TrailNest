'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOwner, clearSession } from '@/lib/auth';
import Button from '@/components/ui/Button';
import styles from './SiteHeader.module.css';

export default function SiteHeader() {
  const [owner, setOwner] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const sync = () => setOwner(getOwner());
    sync();
    window.addEventListener('trailnest-auth-change', sync);
    return () => window.removeEventListener('trailnest-auth-change', sync);
  }, []);

  function handleLogout() {
    clearSession();
    router.push('/');
  }

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.row}>
          <div className={styles.brand}>
            <Link href="/" className={styles.wordmark}>
              TrailNest
            </Link>
            <span className={styles.tagline}>quiet stays, off the beaten path</span>
          </div>

          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>
              Listings
            </Link>
            {owner ? (
              <>
                <Link href="/dashboard" className={styles.navLink}>
                  Dashboard
                </Link>
                <Button variant="ghost" size="small" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.navLink}>
                  Log in
                </Link>
                <Button as={Link} href="/register" variant="secondary" size="small">
                  List a stay
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
      <div className="container">
        <div className="trail-divider" role="presentation" />
      </div>
    </header>
  );
}
