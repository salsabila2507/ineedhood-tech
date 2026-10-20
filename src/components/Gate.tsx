import { useState } from 'react';
import { enterGuest, login } from '../api';
import { LangToggle, useLang } from '../lang';

export function Gate({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setErr('');
    const ok = await login(pw);
    setBusy(false);
    if (ok) { onDone(); return; }
    setErr(t('gateWrong'));
    setPw('');
  };

  // No password needed. The session this returns can only read, so the office
  // is safe to show to someone who just wants to look around.
  const watch = async () => {
    if (busy) return;
    setBusy(true);
    setErr('');
    const ok = await enterGuest();
    setBusy(false);
    if (ok) { onDone(); return; }
    setErr(t('gateWrong'));
  };

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-logo">ineedhood tech</div>
        <h2>{t('gateTitle')}</h2>
        <p>{t('gateHint')}</p>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={t('gatePassword')}
          aria-label={t('gatePassword')}
        />
        <button className="gate-btn" type="submit" disabled={busy || !pw}>
          {busy ? t('gateChecking') : t('gateSubmit')}
        </button>
        <button className="gate-btn ghost" type="button" onClick={watch} disabled={busy}>
          {t('guestEnter')}
        </button>
        <div className="gate-note">{t('guestHint')}</div>
        {err && <div className="gate-err">{err}</div>}
        <div className="gate-note">{t('gateNote')}</div>
        <LangToggle />
      </form>
    </div>
  );
}
