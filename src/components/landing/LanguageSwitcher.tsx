import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'hi', label: 'हिन्दी',      flag: '🇮🇳' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
];

const L = {
  bg0: '#030303', bg3: '#171717',
  b2: '#222222', b3: '#333333',
  t1: '#f5f5f5', t2: '#a3a3a3', t3: '#666666',
  accent: '#4ade80',
  accentBg: 'rgba(74,222,128,0.06)',
  accentBorder: 'rgba(74,222,128,0.15)',
  fontBody: "'DM Sans', system-ui, sans-serif",
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const select = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Change language"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 4 : 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 500,
          color: open ? L.t1 : L.t3,
          padding: compact ? '6px 8px' : '6px 12px',
          borderRadius: 8,
          transition: 'all .2s',
          fontFamily: L.fontBody,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = L.t1;
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.color = L.t3;
            (e.currentTarget as HTMLElement).style.background = 'none';
          }
        }}
      >
        {/* Globe icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        {!compact && (
          <span>{current.label}</span>
        )}
        {compact && (
          <span style={{ fontSize: 14 }}>{current.flag}</span>
        )}
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          zIndex: 500,
          minWidth: 160,
          background: 'rgba(10,10,10,0.98)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${L.b2}`,
          borderRadius: 10,
          padding: '4px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          animation: 'qvLangFadeDown .15s cubic-bezier(.4,0,.2,1) both',
        }}>
          <style>{`
            @keyframes qvLangFadeDown {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {LANGUAGES.map(lang => {
            const isActive = lang.code === i18n.language;
            return (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', background: isActive ? L.accentBg : 'none',
                  border: 'none', cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 7,
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  color: isActive ? L.accent : L.t2,
                  fontFamily: L.fontBody,
                  transition: 'background .15s, color .15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.color = L.t1;
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'none';
                    (e.currentTarget as HTMLElement).style.color = L.t2;
                  }
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{lang.flag}</span>
                <span>{lang.label}</span>
                {isActive && (
                  <svg style={{ marginLeft: 'auto' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
