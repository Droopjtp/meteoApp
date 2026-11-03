import { Link } from 'react-router';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Page introuvable</h1>
      <p className={styles.text}>Cette adresse ne correspond à aucune page.</p>
      <Link to="/" className={styles.link}>
        Retour aux conversations
      </Link>
    </div>
  );
}
