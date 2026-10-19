import type { ComponentPropsWithRef } from 'react';
import styles from './Button.module.css';

export function Button({
  variant = 'secondary',
  type = 'button',
  className,
  ...props
}: ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.button, styles[variant], className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
