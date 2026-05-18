import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

export type Plan = 'free' | 'pro' | 'team';

interface SubscriptionState {
    plan: Plan;
    loading: boolean;
}

export function useSubscription(): SubscriptionState {
    const { session } = useAuth();
    const [plan, setPlan] = useState<Plan>('free');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session?.user) {
            setPlan('free');
            setLoading(false);
            return;
        }

        supabase
            .from('profiles')
            .select('plan')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
                setPlan((data?.plan as Plan) ?? 'free');
                setLoading(false);
            });
    }, [session]);

    return { plan, loading };
}

export function planCanUse(plan: Plan, feature: 'multi_view' | 'studio' | 'collaboration'): boolean {
    switch (feature) {
        case 'multi_view':    return plan === 'pro' || plan === 'team';
        case 'studio':        return plan === 'pro' || plan === 'team';
        case 'collaboration': return plan === 'team';
        default:              return false;
    }
}
