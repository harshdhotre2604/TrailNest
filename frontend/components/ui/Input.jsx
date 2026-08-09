import styles from './Input.module.css';

export default function Input({
  label,
  as: Tag = 'input',
  error,
  id,
  className = '',
  ...props
}) {
  const fieldId = id || props.name;

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={fieldId}>
          {label}
        </label>
      )}
      <Tag id={fieldId} className={[styles.control, className].filter(Boolean).join(' ')} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
