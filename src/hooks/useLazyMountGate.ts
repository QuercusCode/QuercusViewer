import { useState } from 'react';

// Some modals are unconditionally mounted — they manage their own
// open/closed presentation via an `isOpen` prop, often so a close animation
// can play out — and are also code-split with React.lazy() to keep a heavy
// vendor dependency (jsPDF, qrcode, ...) out of the main bundle. Mounting a
// lazy component at all, even with isOpen={false}, triggers its dynamic
// import immediately, which would defeat the point of lazy-loading it. This
// hook defers that first mount until `trigger` has been true at least once,
// then keeps returning true thereafter so `isOpen` can keep controlling the
// modal's presentation normally once it's loaded.
//
// The state update happens during render, not in an effect: this is React's
// documented pattern for adjusting state in response to a prop change
// (https://react.dev/reference/react/useState#storing-information-from-previous-renders).
// The `!hasTriggered` guard keeps it from looping — once true, this branch
// never runs again — and avoids the extra effect-then-re-render roundtrip a
// useEffect-based version would need.
export function useLazyMountGate(trigger: boolean): boolean {
    const [hasTriggered, setHasTriggered] = useState(false);
    if (trigger && !hasTriggered) {
        setHasTriggered(true);
    }
    return hasTriggered;
}
