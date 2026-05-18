import { useState } from 'react';
import { useSubscription, planCanUse } from '../lib/useSubscription';
import { UpgradeModal } from './UpgradeModal';
import type { Plan } from '../lib/useSubscription';

interface Props {
    feature: 'multi_view' | 'studio' | 'collaboration';
    featureName: string;
    requiredPlan: 'pro' | 'team';
    children: React.ReactNode;
    /** If true, renders a clickable overlay instead of hiding the children */
    overlay?: boolean;
}

export function FeatureGate({ feature, featureName, requiredPlan, children, overlay = false }: Props) {
    const { plan, loading } = useSubscription();
    const [showModal, setShowModal] = useState(false);

    if (loading) return null;

    const allowed = planCanUse(plan, feature);

    if (allowed) return <>{children}</>;

    if (overlay) {
        return (
            <>
                <div style={{ position: 'relative', userSelect: 'none' }}>
                    <div style={{ pointerEvents: 'none', opacity: 0.35, filter: 'blur(1px)' }}>
                        {children}
                    </div>
                    <div
                        onClick={() => setShowModal(true)}
                        style={{
                            position: 'absolute', inset: 0, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(3,3,3,0.55)', backdropFilter: 'blur(2px)',
                            borderRadius: 10,
                        }}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'rgba(10,10,10,0.9)', border: '1px solid #222',
                            borderRadius: 10, padding: '10px 16px',
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                            fontSize: 13, fontWeight: 600, color: '#f5f5f5',
                        }}>
                            <span style={{ fontSize: 15 }}>🔒</span>
                            {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} feature — click to upgrade
                        </div>
                    </div>
                </div>
                {showModal && (
                    <UpgradeModal
                        requiredPlan={requiredPlan}
                        featureName={featureName}
                        onClose={() => setShowModal(false)}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <div
                onClick={() => setShowModal(true)}
                title={`Upgrade to ${requiredPlan} to use ${featureName}`}
                style={{ cursor: 'pointer', display: 'contents' }}
            >
                {children}
            </div>
            {showModal && (
                <UpgradeModal
                    requiredPlan={requiredPlan}
                    featureName={featureName}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
