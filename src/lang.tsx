import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { lang as readLang, setLang as writeLang, t as translate, tc as translateCount, type Lang } from './i18n';

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  tc: (key: string, n: number) => string;
};

const FALLBACK: LangCtx = {
  lang: 'id',
  setLang: () => undefined,
  t: (k) => k,
  tc: (k) => k,
};

const Ctx = createContext<LangCtx>(FALLBACK);

export function LangProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Lang>(() => readLang());

  useEffect(() => {
    writeLang(current);
  }, [current]);

  // Stable per language. A memo that translates text can then list `tr` as a
  // real dependency instead of listing `lang` and relying on the side effect.
  const t = useCallback((k: string) => translate(k, current), [current]);
  const tc = useCallback((k: string, n: number) => translateCount(k, current, n), [current]);
  const value = useMemo<LangCtx>(
    () => ({ lang: current, setLang: setCurrent, t, tc }),
    [current, t, tc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}

const STATUS_KEY: Record<string, string> = {
  working: 'stWorking',
  searching: 'stSearching',
  idle: 'stIdle',
  blocked: 'stBlocked',
  running: 'stInProgress',
  queued: 'stQueued',
  waiting: 'stWaiting',
  done: 'stDone',
  failed: 'stFailed',
};

export function statusText(status: string, tr: (k: string) => string): string {
  return tr(STATUS_KEY[status] || 'stIdle');
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language / Bahasa">
      <button
        type="button"
        className={lang === 'id' ? 'on' : ''}
        onClick={() => setLang('id')}
        aria-pressed={lang === 'id'}
      >
        ID
      </button>
      <button
        type="button"
        className={lang === 'en' ? 'on' : ''}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  );
}
