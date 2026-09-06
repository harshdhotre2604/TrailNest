import Link from 'next/link';
import Card from '@/components/ui/Card';
import { assetUrl } from '@/lib/api';
import styles from './PropertyCard.module.css';

export default function PropertyCard({ property }) {
  return (
    <Card as={Link} href={`/property/${property.id}`} interactive className={styles.card}>
      <div className={styles.imageWrap}>
        {property.primary_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(property.primary_image_url)}
            alt={property.name}
            className={styles.image}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>
      <div className={styles.body}>
        <span className="eyebrow">
          {property.type} · {property.location}
        </span>
        <h3 className={styles.name}>{property.name}</h3>
        <div className={styles.meta}>
          <span className={styles.price}>
            ${Number(property.price_per_night).toFixed(0)}
            <span className={styles.priceUnit}> / night</span>
          </span>
        </div>
      </div>
    </Card>
  );
}
