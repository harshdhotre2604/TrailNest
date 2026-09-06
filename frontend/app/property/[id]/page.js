import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, assetUrl } from '@/lib/api';
import Card from '@/components/ui/Card';
import InquiryForm from '@/components/property/InquiryForm';
import styles from './page.module.css';

export default async function PropertyDetailPage({ params }) {
  const { id } = await params;

  let property;
  try {
    const data = await api.getProperty(id);
    property = data.property;
  } catch {
    notFound();
  }

  return (
    <div className="container">
      <Link href="/" className={styles.back}>
        ← Back to listings
      </Link>

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

      <div className="trail-divider" role="presentation" />

      <div className={styles.layout}>
        <div>
          <span className="eyebrow">
            {property.type} · {property.location}
          </span>
          <h1 className={styles.name}>{property.name}</h1>
          <p className={styles.price}>
            ${Number(property.price_per_night).toFixed(0)}
            <span className={styles.priceUnit}> / night</span>
          </p>

          {property.description && (
            <p className={styles.description} style={{ marginTop: '1.5rem' }}>
              {property.description}
            </p>
          )}
        </div>

        <Card padded className={styles.inquiryCard}>
          <InquiryForm propertyId={property.id} propertyName={property.name} />
        </Card>
      </div>
    </div>
  );
}
