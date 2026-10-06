import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * PollutantModal — a centred dialog that hosts the pollutant detail panel.
 *
 * Why a portal: the trigger sits inside a `.card` in the three-up `.panels`
 * grid. Those ancestors establish containing blocks and stacking contexts, so a
 * fixed-position child would be clipped or mis-layered. Rendering into
 * `document.body` sidesteps all of it.
 *
 * Accessibility / behaviour
 * -------------------------
 * • `role="dialog"` + `aria-modal`, labelled by the dialog's own heading.
 * • Escape closes; a click on the backdrop closes; the close button closes.
 *   Clicks inside the dialog never bubble out to the backdrop because the
 *   backdrop *is* the scroll container, so the check is on `target === currentTarget`.
 * • Focus moves into the dialog on open and returns to the trigger on close.
 * • Tab is trapped: without this, tabbing walks into the page behind the
 *   overlay, which is invisible to a sighted keyboard user and confusing to a
 *   screen reader.
 * • Body scroll is locked while open, restored to the previous value on close.
 */

/** Everything the browser will let us focus, in DOM order. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function PollutantModal({ open, onClose, children }) {
  const { t } = useI18n();
  const dialogRef = useRef(null);
  // Remember what had focus before opening so we can hand it back.
  const restoreRef = useRef(null);
  const titleId = useId();

  const close = useCallback(() => onClose?.(), [onClose]);

  // Focus management + scroll lock, applied only while open.
  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    const { body, documentElement: html } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;

    // Locking scroll on a page that HAS a scrollbar would otherwise shift the
    // whole layout sideways by the scrollbar width. Reserve that space.
    const gap = window.innerWidth - html.clientWidth;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    // Move focus inside. Prefer the close button: it is a stable, always-present
    // target, and landing on it announces the dialog name first.
    const first = dialogRef.current?.querySelector(FOCUSABLE);
    first?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab') return;

      // Cycle focus within the dialog.
      const nodes = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE) ?? []).filter(
        (n) => n.offsetParent !== null || n === document.activeElement
      );
      if (!nodes.length) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      // Return focus to whatever opened the dialog.
      const back = restoreRef.current;
      if (back && typeof back.focus === 'function' && document.contains(back)) {
        back.focus();
      }
    };
  }, [open, close]);

  if (!open) return null;

  return createPortal(
    <div
      className="poll-modal-backdrop"
      // Only a click that starts AND ends on the backdrop closes it, so a drag
      // that begins inside the dialog and ends on the backdrop is ignored.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="poll-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <div className="poll-modal-bar">
          <h2 id={titleId} className="poll-modal-title">
            {t('poll.aria.dialog')}
          </h2>
          <button type="button" className="poll-modal-close" onClick={close} aria-label={t('poll.close')}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="poll-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
