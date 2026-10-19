import { useState, useEffect, useCallback, useRef } from 'react';
import type { RepresentationType, ColoringType, ColorPalette, ResidueInfo, Measurement, RadiusSourceType, SurfaceAlgorithm } from '../types';

export interface VisualState {
    representation: RepresentationType;
    coloring: ColoringType;
    colorPalette: ColorPalette;
    showLigands: boolean;
    showIons: boolean;
    showWaters: boolean;
    showSurface: boolean;
    radiusType?: RadiusSourceType;
    radiusScale: number;
    surfaceWireframe: boolean;
    surfaceType?: SurfaceAlgorithm;
    customBackgroundColor: string;
    isSpinning: boolean;
    isCleanMode: boolean;
    showContactMap: boolean;
    isPublicationMode: boolean;
    highlightedResidue: ResidueInfo | null;
    measurements: Measurement[];
}

interface UseVisualStackProps {
    state: VisualState;
    onChange: (newState: VisualState) => void;
    resetTrigger?: any; // e.g. pdbId, to reset stack
}

const MAX_STACK_SIZE = 50;

export function useVisualStack({ state, onChange, resetTrigger }: UseVisualStackProps) {
    const [past, setPast] = useState<VisualState[]>([]);
    const [future, setFuture] = useState<VisualState[]>([]);

    // Ref to track if we are currently performing an undo/redo to avoid pushing to stack
    const isInternalChange = useRef(false);

    // Track previous state to compare
    const prevStateRef = useRef<VisualState>(state);

    // Reset stack when trigger changes (e.g. new protein loaded)
    useEffect(() => {
        setPast([]);
        setFuture([]);
        prevStateRef.current = state;
    }, [resetTrigger]);

    // Listen for external changes
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            prevStateRef.current = state;
            return;
        }

        // Compare with prev state to ensure actual change (deep check ideal, but shallow sufficient for primitives/enums)
        const prev = prevStateRef.current;
        const hasChanged =
            prev.representation !== state.representation ||
            prev.coloring !== state.coloring ||
            prev.colorPalette !== state.colorPalette ||
            prev.showLigands !== state.showLigands ||
            prev.showIons !== state.showIons ||
            prev.showWaters !== state.showWaters ||
            prev.showSurface !== state.showSurface ||
            prev.radiusType !== state.radiusType ||
            prev.radiusScale !== state.radiusScale ||
            prev.surfaceWireframe !== state.surfaceWireframe ||
            prev.surfaceType !== state.surfaceType ||
            prev.customBackgroundColor !== state.customBackgroundColor ||
            prev.isSpinning !== state.isSpinning ||
            prev.isCleanMode !== state.isCleanMode ||
            prev.showContactMap !== state.showContactMap ||
            prev.isPublicationMode !== state.isPublicationMode ||
            prev.highlightedResidue !== state.highlightedResidue ||
            prev.measurements !== state.measurements;

        if (hasChanged) {
            setPast(prevPast => {
                const newPast = [...prevPast, prev];
                if (newPast.length > MAX_STACK_SIZE) return newPast.slice(1);
                return newPast;
            });
            setFuture([]); // Clear future on new branch
            prevStateRef.current = state;
        }
    }, [state]);

    const undo = useCallback(() => {
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        isInternalChange.current = true; // Signal that next effect run is internal
        onChange(previous);

        setPast(newPast);
        setFuture(prevFuture => [state, ...prevFuture]);
    }, [past, state, onChange]);

    const redo = useCallback(() => {
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        isInternalChange.current = true;
        onChange(next);

        setPast(prevPast => [...prevPast, state]);
        setFuture(newFuture);
    }, [future, state, onChange]);

    return {
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0
    };
}
