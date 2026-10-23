import { Button } from '../../shared/components/Button';
import styles from './Menu.module.css';
export function MenuState({
  message,
  retry,
  retryLabel = 'Reintentar',
}: {
  message: string;
  retry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className={styles.state} role={retry ? 'alert' : 'status'}>
      <p>{message}</p>
      {retry && <Button onClick={retry}>{retryLabel}</Button>}
    </div>
  );
}
