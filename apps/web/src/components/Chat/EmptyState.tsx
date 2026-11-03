import styles from './Chat.module.css';

const SUGGESTIONS = [
  'Comment vont évoluer les températures à Lyon cette semaine ?',
  'Compare la pluie à Paris et Marseille sur les 3 derniers jours',
  'Degrés-jours de chauffage à Strasbourg le mois dernier',
  'Température et vent à Brest dans les prochaines 48 h',
];

interface EmptyStateProps {
  onPick: (text: string) => void;
  disabled?: boolean;
}

export function EmptyState({ onPick, disabled }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <h1 className={styles.emptyTitle}>Explorez la météo en langage naturel</h1>
      <p className={styles.emptyText}>
        Prévisions jusqu'à 16 jours, historique depuis 1940, n'importe où dans le monde. Les
        réponses arrivent sous forme de graphiques.
      </p>
      <div className={styles.suggestions}>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className={styles.suggestion}
            onClick={() => onPick(suggestion)}
            disabled={disabled}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
