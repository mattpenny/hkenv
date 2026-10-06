import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * PollutantButton — the sparkle icon that opens the pollutant detail dialog.
 *
 * Lives in the Air Quality card's header row (top-right), beside the region
 * tabs. It carries a slow "breathing" pulse so it reads as an affordance the
 * user can act on rather than as decoration.
 *
 * The animation is purely decorative: it is disabled under
 * `prefers-reduced-motion: reduce` (see styles.css) because a pulsing element
 * that never settles is a genuine problem for vestibular sensitivity and for
 * anyone trying to read the card.
 *
 * The count badge is deliberately omitted when the data is unavailable — the
 * button still opens the dialog, which explains why there is nothing to show,
 * so hiding the button entirely would leave the user with no explanation.
 */
export default function PollutantButton({ onClick, count, disabled }) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      className="poll-open-btn"
      onClick={onClick}
      disabled={disabled}
      title={t('poll.openHint')}
      aria-label={t('poll.open')}
      aria-haspopup="dialog"
    >
      <span className="poll-open-icon" aria-hidden="true">
        {/* Sparkle: one large four-point star plus two small ones. */}
        <svg viewBox="0 0 24 24" width="19" height="19" focusable="false">
          <path
            d="M12 2.6l1.72 5.02a3 3 0 0 0 1.86 1.86L20.6 11.2l-5.02 1.72a3 3 0 0 0-1.86 1.86L12 19.8l-1.72-5.02a3 3 0 0 0-1.86-1.86L3.4 11.2l5.02-1.72A3 3 0 0 0 10.28 7.62z"
            fill="currentColor"
          />
          <path d="M18.6 2.2l.62 1.8 1.8.62-1.8.62-.62 1.8-.62-1.8-1.8-.62 1.8-.62z" fill="currentColor" />
          <path d="M19.4 16.2l.5 1.45 1.45.5-1.45.5-.5 1.45-.5-1.45-1.45-.5 1.45-.5z" fill="currentColor" />
        </svg>
      </span>
      <span className="poll-open-label">{t('poll.open')}</span>
      {count > 0 && <span className="poll-open-count">{count}</span>}
    </button>
  );
}
