import { api } from '@/lib/api';
import PropertyCard from '@/components/property/PropertyCard';
import styles from './page.module.css';

export default async function HomePage() {
  let properties = [];
  let loadError = null;

  try {
    const data = await api.listProperties();
    properties = data.properties;
  } catch (err) {
    loadError = err.message;
  }

  return (
    <div className="container">
      <section className={styles.hero}>
        <span className="eyebrow">{properties.length || 'A few'} stays, chosen slowly</span>
        <h1 className={styles.headline}>Places worth the drive.</h1>
        <p className={styles.sub}>
          No towers, no resorts — just cabins, farmstays, and cottages kept by people who
          answer their own inquiries.
        </p>
      </section>

      <div className="trail-divider" role="presentation" />

      {loadError && (
        <p className={styles.empty}>
          Couldn&apos;t reach the TrailNest API right now ({loadError}). Is the backend running?
        </p>
      )}

      {!loadError && properties.length === 0 && (
        <p className={styles.empty}>No stays listed yet — check back soon.</p>
      )}

      {!loadError && properties.length > 0 && (
        <div className={styles.grid}>
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
