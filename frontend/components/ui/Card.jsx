import styles from './Card.module.css';

export default function Card({
  padded = false,
  interactive = false,
  as: Tag = 'div',
  className = '',
  ...props
}) {
  const classes = [
    styles.card,
    padded ? styles.padded : '',
    interactive ? styles.interactive : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes} {...props} />;
}
