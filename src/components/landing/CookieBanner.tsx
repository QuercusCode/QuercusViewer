import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initGA } from '../../utils/analytics';

const CONSENT_KEY = 'qv_cookie_consent';

export type ConsentState = 'accepted' | 'declined' | null;

export function getConsent(): ConsentState {
    try {
        return (localStorage.getItem(CONSENT_KEY) as ConsentState) ?? null;
    } catch {
        return null;
    }
}

export function CookieBanner() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (getConsent() === null) {
            const timer = setTimeout(() => setVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        setVisible(false);
        initGA();
    };

    const decline = () => {
        localStorage.setItem(CONSENT_KEY, 'declined');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, width: 'min(520px, calc(100vw - 32px))',
            background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)',
            border: '1px solid #222', borderRadius: 14,
            padding: '18px 20px', display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', gap: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            animation: 'qvCookieSlideUp .4s cubic-bezier(.4,0,.2,1) both',
            fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
            <style>{`
                @keyframes qvCookieSlideUp {
                    from { opacity:0; transform:translateX(-50%) translateY(16px); }
                    to   { opacity:1; transform:translateX(-50%) translateY(0); }
                }
            `}</style>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#a3a3a3' }}>
                    <span style={{ color: '#f5f5f5', fontWeight: 600 }}>{t('cookie.title')}</span>
                    {' — '}{t('cookie.desc')}{' '}
                    <a href="https://github.com/QuercusCode/QuercusViewer#privacy" target="_blank" rel="noopener"
                        style={{ color: '#4ade80', textDecoration: 'none', fontSize: 12 }}>
                        {t('cookie.privacy')} ↗
                    </a>
                </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={decline} style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #333',
                    background: 'transparent', color: '#666', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, transition: 'all .2s',
                    fontFamily: 'inherit',
                }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#555'; (e.currentTarget as HTMLElement).style.color = '#999'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#333'; (e.currentTarget as HTMLElement).style.color = '#666'; }}
                >{t('cookie.decline')}</button>
                <button onClick={accept} style={{
                    padding: '8px 18px', borderRadius: 8, border: 'none',
                    background: '#4ade80', color: '#050505', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, transition: 'all .2s',
                    fontFamily: 'inherit',
                }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >{t('cookie.accept')}</button>
            </div>
        </div>
    );
}
