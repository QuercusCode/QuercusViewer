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
    // onClose is typically a fresh inline arrow function on every render of
    // whatever renders this modal — read the latest one from a ref inside
    // the Escape handler instead of depending on it directly below.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    // Move focus into the dialog (and remember what to restore it to) only
    // when the modal actually transitions open — not on every re-render
    // while it stays open. Depending on `onClose` here previously meant any
    // state update caused by interacting with something INSIDE the dialog
    // (e.g. a slider's onChange bubbling up to a parent) recreated that
    // inline callback, re-ran this effect, and yanked focus back onto the
    // dialog container mid-interaction — breaking keyboard use of anything
    // other than a single click inside the modal.
    useEffect(() => {
        if (!isOpen) return;

        triggerRef.current = document.activeElement as HTMLElement | null;
        containerRef.current?.focus();

        return () => {
            triggerRef.current?.focus?.();
        };
    }, [isOpen, containerRef]);

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCloseRef.current?.();
        };
        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    return containerRef;
}
