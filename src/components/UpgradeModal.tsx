import { useEffect } from 'react';
import type { Plan } from '../lib/useSubscription';

interface Props {
    requiredPlan: 'pro' | 'team';
    featureName: string;
    onClose: () => void;
}

const STRIPE_LINKS: Record<'pro' | 'team', string> = {
    pro:  'https://buy.stripe.com/pro_placeholder',
    team: 'https://buy.stripe.com/team_placeholder',
};

const PLAN_PRICE: Record<'pro' | 'team', string> = {
    pro:  '$12 / mo',
    team: '$29 / mo',
};

const PLAN_PERKS: Record<'pro' | 'team', string[]> = {
    pro: [
        'Up to 4 simultaneous side-by-side views',
        'Studio mode & keyframe animation',
        'Advanced color schemes',
        'Publication-quality PNG export',
        'PDF summary reports',
    ],
    team: [
        'Everything in Pro',
        'Real-time live collaboration',
        'Shared team structure library',
        'Presence cursors & voice sync',
        'Admin dashboard',
    ],
};

export function UpgradeModal({ requiredPlan, featureName, onClose }: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const accent = '#4ade80';
    const font = "'Space Grotesk', system-ui, sans-serif";
    const body = "'DM Sans', system-ui, sans-serif";

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#0a0a0a', border: '1px solid #1e1e1e',
                    borderRadius: 18, padding: '36px 32px', maxWidth: 440, width: '100%',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
                    fontFamily: body,
                    animation: 'qvModalIn .3s cubic-bezier(.4,0,.2,1) both',
                }}
            >
                <style>{`
                    @keyframes qvModalIn {
                        from { opacity:0; transform:scale(.96) translateY(8px); }
                        to   { opacity:1; transform:scale(1) translateY(0); }
                    }
                `}</style>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <div style={{
                            fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 500,
                            color: accent, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6,
                        }}>
                            {requiredPlan.toUpperCase()} PLAN REQUIRED
                        </div>
                        <h2 style={{ fontFamily: font, fontSize: 22, fontWeight: 700, color: '#f5f5f5', margin: 0, lineHeight: 1.2 }}>
                            Unlock {featureName}
                        </h2>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#555', padding: 4, borderRadius: 6, transition: 'color .2s',
                        lineHeight: 1, fontSize: 20,
                    }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#aaa'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#555'; }}
                    >✕</button>
                </div>

                {/* Perks */}
                <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {PLAN_PERKS[requiredPlan].map(perk => (
                        <li key={perk} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#a3a3a3' }}>
                            <span style={{
                                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, color: accent,
                            }}>✓</span>
                            {perk}
                        </li>
                    ))}
                </ul>

                {/* Price + CTA */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a1a',
                    borderRadius: 12, padding: '20px 20px', marginBottom: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                    <div>
                        <div style={{ fontFamily: font, fontSize: 26, fontWeight: 700, color: '#f5f5f5', lineHeight: 1 }}>
                            {PLAN_PRICE[requiredPlan]}
                        </div>
                        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>per workspace · cancel anytime</div>
                    </div>
                    <a
                        href={STRIPE_LINKS[requiredPlan]}
                        target="_blank"
                        rel="noopener"
                        style={{
                            fontFamily: font, fontSize: 14, fontWeight: 600,
                            padding: '12px 24px', borderRadius: 10, border: 'none',
                            background: accent, color: '#050505', cursor: 'pointer',
                            textDecoration: 'none', display: 'inline-block',
                            transition: 'filter .2s, transform .2s', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                    >
                        Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} →
                    </a>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#404040', textAlign: 'center', lineHeight: 1.5 }}>
                    Secure checkout via Stripe · No commitment · Instant access
                </p>
            </div>
        </div>
    );
}
