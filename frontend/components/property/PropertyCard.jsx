import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import styles from './PropertyCard.module.css';

export default function PropertyCard({ property }) {
  return (
    <Card as={Link} href={`/property/${property.id}`} interactive className={styles.card}>
      <div className={styles.imageWrap}>
        {property.cover_image_url && (
          <Image
            src={property.cover_image_url}
            alt={property.name}
            fill
            sizes="(max-width: 700px) 100vw, 33vw"
            className={styles.image}
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
