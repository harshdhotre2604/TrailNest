import styles from './SiteFooter.module.css';

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className="trail-divider" role="presentation" />
        <div className={styles.row}>
          <span>TrailNest — a small, fictional collection of stays.</span>
          <span>Built as a DevOps reference project.</span>
        </div>
      </div>
    </footer>
  );
}
