'use client';

import styles from './ops-map.module.css';

export default function OpsGate({
  title,
  lead,
  draft,
  error,
  hint,
  onDraft,
  onUnlock,
}: {
  title: string;
  lead: string;
  draft: string;
  error?: string | null;
  hint?: string | null;
  onDraft: (v: string) => void;
  onUnlock: (key: string) => void;
}) {
  return (
    <main className={styles.gate}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onUnlock(draft);
        }}
      >
        <p className={styles.kicker}>Local ops</p>
        <h1>{title}</h1>
        <p>
          {lead} Enter <code>OPS_DASHBOARD_SECRET</code> from <code>.env.local</code>.
        </p>
        <label>
          Secret
          <input
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="OPS_DASHBOARD_SECRET"
          />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        {hint ? <p className={styles.hintText}>{hint}</p> : null}
        <button type="submit">Open</button>
      </form>
    </main>
  );
}
