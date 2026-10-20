import { Button } from '../../shared/components/Button';
import styles from './Menu.module.css';
export function MenuState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className={styles.state} role={retry ? 'alert' : 'status'}>
      <p>{message}</p>
      {retry && <Button onClick={retry}>Reintentar</Button>}
    </div>
  );
}
