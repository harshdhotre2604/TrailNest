import styles from './Button.module.css';

export default function Button({
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  as: Tag = 'button',
  className = '',
  ...props
}) {
  const classes = [
    styles.button,
    styles[variant],
    size === 'small' ? styles.small : '',
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes} {...props} />;
}
