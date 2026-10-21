import { useEffect, useRef, type RefObject } from 'react';

// Every modal in this app rendered a full-screen overlay with no keyboard
// escape hatch and no focus management at all: Escape didn't close it, and
// Tab could cycle focus out to the (dimmed, inert-looking) page behind it.
// This is a minimal fix, not a full focus trap — it moves focus into the
// dialog on open, closes on Escape, and restores focus to whatever triggered
// it on close. Pair the returned ref with role="dialog" aria-modal="true" on
// the modal's outer container.
//
// Pass `externalRef` when the modal already owns a ref on that same element
// (e.g. for html2canvas/export capture) instead of creating a second one.
export function useModalA11y<T extends HTMLElement>(isOpen: boolean, onClose?: () => void, externalRef?: RefObject<T | null>) {
    const ownRef = useRef<T>(null);
    const containerRef = externalRef ?? ownRef;
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        triggerRef.current = document.activeElement as HTMLElement | null;
        containerRef.current?.focus();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose) onClose();
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            triggerRef.current?.focus?.();
        };
    }, [isOpen, onClose, containerRef]);

    return containerRef;
}
