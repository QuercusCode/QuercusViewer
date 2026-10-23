import React, { useMemo, useState } from 'react';
import { X, Plus, Eye, EyeOff, Trash2, Upload, FileDown, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import type { ChainInfo, RepresentationType, SuperposedStructure } from '../types';
import { useTranslation } from '../lib/i18n';
import { useModalA11y } from '../hooks/useModalA11y';
import { alignSequences } from '../utils/sequenceAlignment';

interface SuperpositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    overlays: SuperposedStructure[];
    primaryChains?: ChainInfo[];
    onAddOverlay: (structure: SuperposedStructure) => void;
    onRemoveOverlay: (id: string) => void;
    onToggleOverlay: (id: string) => void;
    onUpdateOverlay: (id: string, updates: Partial<SuperposedStructure>) => void;
    onOpenAlignment: () => void;
    getSnapshot?: () => Promise<string | null>; // Add snapshot capability
}

interface OverlayFitStat {
    identity: number;
    rmsd?: number;
    primaryChain: string;
    targetChain: string;
}

export const SuperpositionModal: React.FC<SuperpositionModalProps> = ({
    isOpen,
    onClose,
    overlays,
    primaryChains,
    onAddOverlay,
    onRemoveOverlay,
    onToggleOverlay,
    onUpdateOverlay,
    onOpenAlignment,
    getSnapshot
}) => {
    const { t } = useTranslation();
    const [pdbInput, setPdbInput] = useState('');
    const [colorInput, setColorInput] = useState('#FFA500'); // Default Orange

    const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose);

    // Fit-quality summary per overlay — reuses the same Needleman-Wunsch +
    // BLOSUM62 aligner the "Align Seq" sub-modal already uses, so the number
    // shown here always matches what that detailed view would report. Picks
    // the primary/overlay chain pair with the longest alignment as the
    // headline match, since overlay chain IDs aren't guaranteed to line up
    // with the primary structure's (e.g. comparing a single chain upload
    // against one chain of a hetero-multimer).
    const overlayStats = useMemo(() => {
        const result: Record<string, OverlayFitStat | null> = {};
        if (!primaryChains || primaryChains.length === 0) return result;

        overlays.forEach(overlay => {
            if (overlay.superpositionFailed || !overlay.chains || overlay.chains.length === 0) {
                result[overlay.id] = null;
                return;
            }

            // When the user picked an explicit chain pair to align, report
            // stats for exactly that pair — it's what the 3D fit actually
            // used, so the "best match" auto-pick would otherwise disagree
            // with the number that fit was judged by.
            if (overlay.alignMainChain && overlay.alignOverlayChain) {
                const pChain = primaryChains.find(c => c.name === overlay.alignMainChain);
                const tChain = overlay.chains.find(c => c.name === overlay.alignOverlayChain);
                if (pChain && tChain) {
                    const { stats } = alignSequences(pChain, tChain);
                    result[overlay.id] = {
                        identity: stats.identity,
                        rmsd: stats.rmsd,
                        primaryChain: pChain.name,
                        targetChain: tChain.name
                    };
                    return;
                }
            }

            let best: (OverlayFitStat & { length: number }) | null = null;
            primaryChains.forEach(pChain => {
                overlay.chains!.forEach(tChain => {
                    // Comparing a protein chain to a nucleic chain is
                    // meaningless (and can crash the BLOSUM62 scorer on
                    // non-amino-acid letters), so skip cross-type pairs.
                    if (pChain.type && tChain.type && pChain.type !== tChain.type) return;
                    const { stats } = alignSequences(pChain, tChain);
                    if (!best || stats.length > best.length) {
                        best = {
                            identity: stats.identity,
                            rmsd: stats.rmsd,
                            primaryChain: pChain.name,
                            targetChain: tChain.name,
                            length: stats.length
                        };
                    }
                });
            });
            result[overlay.id] = best;
        });

        return result;
    }, [overlays, primaryChains]);

    if (!isOpen) return null;

    const handleGeneratePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;
        let yPos = margin;

        // Dark background
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Load logo
        const logoImg = new Image();
        logoImg.src = '/logo/full-white.png';
        await new Promise((resolve) => {
            logoImg.onload = resolve;
            logoImg.onerror = resolve;
        });

        // Add logo
        if (logoImg.complete && logoImg.naturalWidth > 0) {
            try {
                const coverLogoWidth = 60;
                const coverLogoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * coverLogoWidth;
                const logoX = (pageWidth - coverLogoWidth) / 2;
                doc.addImage(logoImg, 'PNG', logoX, yPos, coverLogoWidth, coverLogoHeight);
                yPos += coverLogoHeight + 8;
            } catch (e) {
                console.warn('Failed to add logo:', e);
            }
        }

        // Title
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Structure Superposition', pageWidth / 2, yPos + 15, { align: 'center' });
        yPos += 30;

        // Subtitle
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Alignment Report', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;

        // Date
        doc.setFontSize(11);
        doc.setTextColor(148, 163, 184);
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(dateStr, pageWidth / 2, yPos, { align: 'center' });
        yPos += 25;

        // Summary section
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 12, 3, 3, 'F');
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Summary', margin + 5, yPos + 8);
        yPos += 18;

        // Stats
        doc.setFontSize(16);
        doc.setTextColor(226, 232, 240);
        doc.text(`Total Structures: ${overlays.length + 1}`, margin, yPos);
        yPos += 8;
        doc.text(`Visible Structures: ${overlays.filter(o => o.isVisible).length + 1}`, margin, yPos);
        yPos += 15;

        // Structures list
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 12, 3, 3, 'F');
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Aligned Structures', margin + 5, yPos + 8);
        yPos += 18;

        // List structures
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(203, 213, 225);

        overlays.forEach((overlay, idx) => {
            const fit = !overlay.superpositionFailed ? overlayStats[overlay.id] : null;
            const boxHeight = fit ? 18 : 12;

            // Structure box
            doc.setFillColor(30, 41, 59, 25);
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, boxHeight, 2, 2, 'F');

            // Color indicator
            const hexColor = overlay.color;
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);
            doc.setFillColor(r, g, b);
            doc.circle(margin + 5, yPos + 6, 2, 'F');

            // Description
            doc.setTextColor(226, 232, 240);
            doc.text(`${idx + 1}. ${overlay.description}`, margin + 12, yPos + 7);

            // Status
            doc.setFontSize(11);
            doc.setTextColor(overlay.isVisible ? 148 : 100, overlay.isVisible ? 226 : 163, overlay.isVisible ? 213 : 184);
            doc.text(overlay.isVisible ? '(Visible)' : '(Hidden)', pageWidth - margin - 20, yPos + 7);

            // Fit quality — RMSD + identity of the best-matching chain pair,
            // computed the same way as the on-screen overlay list.
            if (fit) {
                doc.setTextColor(148, 163, 184);
                const rmsdLabel = fit.rmsd !== undefined ? `${fit.rmsd.toFixed(2)} Å` : 'N/A';
                doc.text(`RMSD ${rmsdLabel} · ${fit.identity.toFixed(0)}% identity (chain ${fit.primaryChain || '—'} vs ${fit.targetChain || '—'})`, margin + 12, yPos + 13);
            }

            doc.setFontSize(14);

            yPos += boxHeight + 3;
        });

        // Add snapshot if available
        if (getSnapshot) {
            yPos += 10;
            try {
                const snapshot = await getSnapshot();
                if (snapshot) {
                    doc.addPage();
                    yPos = margin;

                    // Dark background on new page
                    doc.setFillColor(15, 23, 42);
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');

                    // Logo on new page
                    if (logoImg.complete && logoImg.naturalWidth > 0) {
                        try {
                            const logoWidth = 35;
                            const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
                            doc.addImage(logoImg, 'PNG', pageWidth - margin - logoWidth, margin - 8, logoWidth, logoHeight);
                        } catch (e) {
                            console.warn('Failed to add logo:', e);
                        }
                    }

                    doc.setFontSize(18);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(255, 255, 255);
                    doc.text('3D Superposition View', pageWidth / 2, yPos, { align: 'center' });
                    yPos += 15;

                    const imgWidth = pageWidth - 2 * margin;
                    const imgHeight = imgWidth * 0.75;
                    doc.addImage(snapshot, 'PNG', margin, yPos, imgWidth, imgHeight);
                }
            } catch (e) {
                console.warn('Failed to add snapshot:', e);
            }
        }

        // Save PDF
        doc.save(`superposition_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const handleAddPdb = () => {
        if (!pdbInput || pdbInput.length < 3) return;

        onAddOverlay({
            id: `pdb-${pdbInput}-${Date.now()}`,
            pdbId: pdbInput,
            color: colorInput,
            isVisible: true,
            description: `PDB: ${pdbInput.toUpperCase()}`
        });
        setPdbInput('');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            onAddOverlay({
                id: `file-${file.name}-${Date.now()}`,
                file: file,
                color: colorInput,
                isVisible: true,
                description: file.name
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="bg-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden outline-none">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <h2 className="text-lg font-semibold text-white">{t.superpositionTitle as string}</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleGeneratePDF}
                            title="Generate PDF Report"
                            className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs px-3 py-1.5 rounded-lg border border-violet-500/30 transition-colors flex items-center gap-1.5"
                        >
                            <FileDown size={14} />
                            {t.superpositionReport as string}
                        </button>
                        <button
                            onClick={onOpenAlignment}
                            title="View Sequence Alignment"
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs px-3 py-1.5 rounded-lg border border-cyan-500/30 transition-colors"
                        >
                            {t.superpositionAlignSeq as string}
                        </button>
                        <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Add New Section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t.superpositionAddOverlay as string}</h3>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">PDB</span>
                                <input
                                    type="text"
                                    value={pdbInput}
                                    onChange={(e) => setPdbInput(e.target.value)}
                                    placeholder="e.g. 1u19"
                                    className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddPdb()}
                                />
                            </div>
                            <input
                                type="color"
                                value={colorInput}
                                onChange={(e) => setColorInput(e.target.value)}
                                className="w-10 h-10 rounded shadow-sm cursor-pointer bg-transparent border-0"
                            />
                            <button
                                onClick={handleAddPdb}
                                disabled={!pdbInput}
                                className="bg-cyan-500/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg px-3 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".pdb,.cif,.ent"
                            />
                            <div className="flex items-center justify-center gap-2 w-full bg-neutral-800/30 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg py-3 transition-colors">
                                <Upload size={16} className="text-neutral-400 group-hover:text-cyan-400 transition-colors" />
                                <span className="text-sm text-neutral-400 group-hover:text-neutral-200">Upload File</span>
                            </div>
                        </div>
                    </div>

                    {/* List Section */}
                    {overlays.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Active Overlays</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {overlays.map(item => (
                                    <div key={item.id} className="flex flex-col gap-2 bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0 overflow-hidden flex-1 mr-2">
                                                <div
                                                    className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <div className="flex flex-col min-w-0 overflow-hidden">
                                                    <span className="text-sm font-medium text-neutral-200 truncate" title={item.description}>{item.description || 'Unknown Structure'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-neutral-500 font-mono truncate" title={item.id}>{item.id}</span>

                                                    </div>
                                                    {item.superpositionFailed && (
                                                        <div className="flex items-center gap-1 mt-0.5 text-amber-400" title="Automatic 3D alignment onto the main structure failed — shown in its original orientation. Any RMSD computed against it is not meaningful.">
                                                            <AlertTriangle size={11} className="shrink-0" />
                                                            <span className="text-[10px]">Alignment failed — shown unfitted</span>
                                                        </div>
                                                    )}
                                                    {!item.superpositionFailed && overlayStats[item.id] && (
                                                        <div
                                                            className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-400 font-mono"
                                                            title={`Best-matching chain pair: primary chain ${overlayStats[item.id]!.primaryChain || '(unnamed)'} vs. this overlay's chain ${overlayStats[item.id]!.targetChain || '(unnamed)'}`}
                                                        >
                                                            <span>
                                                                RMSD {overlayStats[item.id]!.rmsd !== undefined ? `${overlayStats[item.id]!.rmsd!.toFixed(2)} Å` : '—'}
                                                            </span>
                                                            <span className="opacity-40">·</span>
                                                            <span>{overlayStats[item.id]!.identity.toFixed(0)}% identity</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onToggleOverlay(item.id)}
                                                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                                >
                                                    {item.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => onRemoveOverlay(item.id)}
                                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Per-overlay style — same treatment the main structure's chains
                                            already get, so an overlay isn't stuck as a fixed translucent
                                            cartoon ghost. */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-700/30">
                                            <select
                                                value={item.representation || 'cartoon'}
                                                onChange={(e) => onUpdateOverlay(item.id, { representation: e.target.value as RepresentationType })}
                                                title="Representation"
                                                className="bg-neutral-900/60 border border-neutral-700 rounded text-[10px] text-neutral-300 pl-1.5 pr-1 py-1 outline-none focus:border-cyan-500/50 shrink-0"
                                            >
                                                <option value="cartoon">Cartoon</option>
                                                <option value="tube">Tube</option>
                                                <option value="rope">Rope</option>
                                                <option value="rocket">Rocket</option>
                                                <option value="ribbon">Ribbon</option>
                                                <option value="ball+stick">Ball &amp; Stick</option>
                                                <option value="licorice">Licorice</option>
                                                <option value="backbone">Backbone</option>
                                                <option value="spacefill">Spacefill</option>
                                                <option value="surface">Surface</option>
                                                <option value="line">Line</option>
                                            </select>
                                            <input
                                                type="color"
                                                value={item.color}
                                                onChange={(e) => onUpdateOverlay(item.id, { color: e.target.value })}
                                                title="Color"
                                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 shrink-0"
                                            />
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    value={Math.round((item.opacity ?? 0.7) * 100)}
                                                    onChange={(e) => onUpdateOverlay(item.id, { opacity: Number(e.target.value) / 100 })}
                                                    title="Opacity"
                                                    className="flex-1 accent-cyan-500 h-1"
                                                />
                                                <span className="text-[9px] text-neutral-500 font-mono w-8 text-right shrink-0">
                                                    {Math.round((item.opacity ?? 0.7) * 100)}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Chain-pair alignment — restricts the 3D fit to a specific
                                            chain on each side instead of NGL's default whole-structure,
                                            sequence-alignment-guided fit across every chain. Useful when
                                            chain IDs don't correspond 1:1, or to compare one domain. */}
                                        {primaryChains && primaryChains.length > 0 && item.chains && item.chains.length > 0 && (
                                            <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-700/30">
                                                <span className="text-[9px] text-neutral-500 uppercase tracking-wider shrink-0">Align</span>
                                                <select
                                                    value={item.alignMainChain || ''}
                                                    onChange={(e) => onUpdateOverlay(item.id, { alignMainChain: e.target.value || undefined })}
                                                    title="Main structure chain to align onto"
                                                    className="bg-neutral-900/60 border border-neutral-700 rounded text-[10px] text-neutral-300 px-1.5 py-1 outline-none focus:border-cyan-500/50 flex-1 min-w-0"
                                                >
                                                    <option value="">Auto</option>
                                                    {primaryChains.map(c => (
                                                        <option key={c.name} value={c.name}>Main :{c.name}</option>
                                                    ))}
                                                </select>
                                                <span className="text-neutral-600 text-[10px] shrink-0">&rarr;</span>
                                                <select
                                                    value={item.alignOverlayChain || ''}
                                                    onChange={(e) => onUpdateOverlay(item.id, { alignOverlayChain: e.target.value || undefined })}
                                                    title="This overlay's chain to align"
                                                    className="bg-neutral-900/60 border border-neutral-700 rounded text-[10px] text-neutral-300 px-1.5 py-1 outline-none focus:border-cyan-500/50 flex-1 min-w-0"
                                                >
                                                    <option value="">Auto</option>
                                                    {item.chains.map(c => (
                                                        <option key={c.name} value={c.name}>This :{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
