/**
 * Manages a "recently viewed structures" list in localStorage.
 * Stores up to MAX_RECENT entries with name, pdbId/url, and timestamp.
 */

const KEY = 'quercus_recent_structures';
const MAX_RECENT = 5;

export interface RecentStructure {
    id: string;            // unique key (pdbId or uuid)
    name: string;          // display name
    pdbId?: string;        // if loaded by PDB ID
    fileType?: string;     // 'pdb', 'cif', etc.
    timestamp: number;     // ms since epoch
}

export function getRecentStructures(): RecentStructure[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        return JSON.parse(raw) as RecentStructure[];
    } catch {
        return [];
    }
}

export function addRecentStructure(entry: Omit<RecentStructure, 'timestamp'>): void {
    try {
        const existing = getRecentStructures().filter(r => r.id !== entry.id);
        const updated = [{ ...entry, timestamp: Date.now() }, ...existing].slice(0, MAX_RECENT);
        localStorage.setItem(KEY, JSON.stringify(updated));
    } catch { /* ignore storage errors */ }
}

export function clearRecentStructures(): void {
    localStorage.removeItem(KEY);
}
