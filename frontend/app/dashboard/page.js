'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { api } from '@/lib/api';
import PropertyCard from '@/components/property/PropertyCard';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

export default function DashboardHomePage() {
  const { ready, token } = useRequireAuth();
  const [properties, setProperties] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    api
      .listMyProperties(token)
      .then((data) => setProperties(data.properties))
      .catch((err) => setError(err.message));
  }, [ready, token]);

  if (!ready || properties === null) {
    return error ? <p className={styles.error}>{error}</p> : null;
  }

  if (properties.length === 0) {
    return (
      <div className={styles.empty}>
        <p>You haven&apos;t listed a stay yet.</p>
        <Button as={Link} href="/dashboard/properties/new" style={{ marginTop: '1rem' }}>
          Add your first property
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
