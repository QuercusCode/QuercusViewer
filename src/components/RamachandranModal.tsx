import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

interface TorsionPoint {
    phi: number | null;
    psi: number | null;
    chain: string;
    resNo: number;
    resName: string;
}

interface RamachandranModalProps {
    isOpen: boolean;
    onClose: () => void;
    getTorsionData: () => Promise<TorsionPoint[]>;
    isLightMode: boolean;
    onHighlightResidue?: (chain: string, resNo: number) => void;
    proteinName?: string;
}

// Approximate, simplified favored/allowed region ellipses for GENERAL (non-Gly/Pro)
// residues, centered on the three classic Ramachandran basins (right-handed helix,
// beta/extended, left-handed helix). These are a reasonable approximation for at-a-
// glance structure validation, not a substitute for DSSP/MolProbity-grade contours
// derived from real statistical data — the UI says so explicitly, matching how the
// rest of this app is careful not to overclaim precision it doesn't have.
interface RegionEllipse {
    cx: number; cy: number; rx: number; ry: number;
}
const REGIONS: { core: RegionEllipse; allowed: RegionEllipse }[] = [
    // Right-handed alpha-helix
    { core: { cx: -63, cy: -43, rx: 25, ry: 27 }, allowed: { cx: -63, cy: -43, rx: 40, ry: 40 } },
    // Beta-sheet / extended
    { core: { cx: -120, cy: 130, rx: 50, ry: 40 }, allowed: { cx: -120, cy: 130, rx: 70, ry: 55 } },
    // Left-handed alpha-helix (rare outside Glycine)
    { core: { cx: 57, cy: 40, rx: 20, ry: 20 }, allowed: { cx: 57, cy: 40, rx: 30, ry: 30 } },
];

const inEllipse = (phi: number, psi: number, e: RegionEllipse) => {
    const dx = (phi - e.cx) / e.rx;
    const dy = (psi - e.cy) / e.ry;
    return dx * dx + dy * dy <= 1;
};

const isInAnyAllowedRegion = (phi: number, psi: number) => REGIONS.some(r => inEllipse(phi, psi, r.allowed));
const isInAnyCoreRegion = (phi: number, psi: number) => REGIONS.some(r => inEllipse(phi, psi, r.core));

const PLOT_SIZE = 460;
const MARGIN = 50;
const CANVAS_SIZE = PLOT_SIZE + MARGIN * 2;

const toScreen = (phi: number, psi: number) => ({
    x: MARGIN + ((phi + 180) / 360) * PLOT_SIZE,
    y: MARGIN + ((180 - psi) / 360) * PLOT_SIZE,
});

export const RamachandranModal: React.FC<RamachandranModalProps> = ({
    isOpen,
    onClose,
    getTorsionData,
    isLightMode,
    onHighlightResidue,
    proteinName = 'Protein Structure',
}) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(false);
    const [points, setPoints] = useState<TorsionPoint[]>([]);
    const [selectedChain, setSelectedChain] = useState<string>('All');
    const [hovered, setHovered] = useState<{ point: TorsionPoint; x: number; y: number } | null>(null);
    const [showOutliers, setShowOutliers] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        const fetchTorsionData = async () => {
            setLoading(true);
            try {
                const data = await getTorsionData();
                if (!cancelled) setPoints(data);
            } catch {
                if (!cancelled) setPoints([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchTorsionData();

        return () => { cancelled = true; };
    }, [isOpen, getTorsionData]);

    const chains = useMemo(() => Array.from(new Set(points.map(p => p.chain))).sort(), [points]);

    const plottable = useMemo(
        () => points.filter(p => p.phi !== null && p.psi !== null && (selectedChain === 'All' || p.chain === selectedChain)) as (TorsionPoint & { phi: number; psi: number })[],
        [points, selectedChain]
    );

    const outliers = useMemo(
        () => plottable.filter(p => p.resName !== 'GLY' && !isInAnyAllowedRegion(p.phi, p.psi)),
        [plottable]
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bg = isLightMode ? '#ffffff' : '#171717';
        const grid = isLightMode ? '#e5e5e5' : '#333333';
        const axisText = isLightMode ? '#525252' : '#a3a3a3';
        const coreFill = isLightMode ? 'rgba(59,130,246,0.18)' : 'rgba(96,165,250,0.22)';
        const allowedFill = isLightMode ? 'rgba(59,130,246,0.08)' : 'rgba(96,165,250,0.10)';

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Favored/allowed region ellipses (allowed first, so core overlays on top)
        REGIONS.forEach(({ core, allowed }) => {
            [{ e: allowed, fill: allowedFill }, { e: core, fill: coreFill }].forEach(({ e, fill }) => {
                const c = toScreen(e.cx, e.cy);
                const rx = (e.rx / 360) * PLOT_SIZE;
                const ry = (e.ry / 360) * PLOT_SIZE;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fillStyle = fill;
                ctx.fill();
            });
        });

        // Gridlines + axes
        ctx.strokeStyle = grid;
        ctx.lineWidth = 1;
        ctx.font = '10px monospace';
        ctx.fillStyle = axisText;
        [-180, -90, 0, 90, 180].forEach(deg => {
            const { x } = toScreen(deg, 0);
            const { y } = toScreen(0, deg);
            ctx.beginPath();
            ctx.moveTo(x, MARGIN);
            ctx.lineTo(x, MARGIN + PLOT_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(MARGIN, y);
            ctx.lineTo(MARGIN + PLOT_SIZE, y);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.fillText(String(deg), x, MARGIN + PLOT_SIZE + 16);
            ctx.textAlign = 'right';
            ctx.fillText(String(deg), MARGIN - 6, y + 3);
        });

        // Plot border
        ctx.strokeStyle = axisText;
        ctx.strokeRect(MARGIN, MARGIN, PLOT_SIZE, PLOT_SIZE);

        // Axis labels
        ctx.fillStyle = axisText;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('φ (phi)', MARGIN + PLOT_SIZE / 2, CANVAS_SIZE - 10);
        ctx.save();
        ctx.translate(14, MARGIN + PLOT_SIZE / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('ψ (psi)', 0, 0);
        ctx.restore();

        // Residue points
        plottable.forEach(p => {
            const { x, y } = toScreen(p.phi, p.psi);
            let color = '#38bdf8'; // general residue
            if (p.resName === 'GLY') color = '#34d399';
            else if (p.resName === 'PRO') color = '#fb923c';
            else if (!isInAnyAllowedRegion(p.phi, p.psi)) color = '#ef4444'; // outlier

            ctx.beginPath();
            ctx.arc(x, y, p.resName === 'GLY' ? 2.5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = isInAnyCoreRegion(p.phi, p.psi) ? 0.95 : 0.8;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }, [plottable, isLightMode]);

    if (!isOpen) return null;

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
        const my = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

        let closest: TorsionPoint | null = null;
        let closestDist = 8; // px hit radius
        for (const p of plottable) {
            const { x, y } = toScreen(p.phi, p.psi);
            const d = Math.hypot(x - mx, y - my);
            if (d < closestDist) {
                closestDist = d;
                closest = p;
            }
        }
        setHovered(closest ? { point: closest, x: e.clientX, y: e.clientY } : null);
    };

    const handleCanvasClick = () => {
        if (hovered && onHighlightResidue) onHighlightResidue(hovered.point.chain, hovered.point.resNo);
    };

    const handleExportPNG = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `ramachandran_${proteinName.replace(/[^a-z0-9]/gi, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const cardBg = isLightMode ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white border border-neutral-800';
    const subtleText = isLightMode ? 'text-neutral-500' : 'text-neutral-400';
    const panelBg = isLightMode ? 'bg-neutral-50' : 'bg-white/5';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className={`relative w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden ${cardBg}`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b ${isLightMode ? 'border-neutral-200' : 'border-neutral-800'}`}>
                    <div>
                        <h2 className="text-lg font-semibold">{t.ramachandranTitle as string}</h2>
                        <p className={`text-xs ${subtleText}`}>{t.ramachandranSubtitle as string}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportPNG}
                            disabled={plottable.length === 0}
                            title={t.ramachandranExport as string}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isLightMode ? 'hover:bg-neutral-100' : 'hover:bg-white/10'}`}
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isLightMode ? 'hover:bg-neutral-100' : 'hover:bg-white/10'}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                        {loading ? (
                            <div className={`flex flex-col items-center gap-2 ${subtleText}`}>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm">{t.ramachandranLoading as string}</span>
                            </div>
                        ) : plottable.length === 0 ? (
                            <div className={`text-center max-w-xs ${subtleText}`}>
                                <p className="text-sm">{t.ramachandranEmpty as string}</p>
                            </div>
                        ) : (
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_SIZE}
                                height={CANVAS_SIZE}
                                style={{ width: Math.min(CANVAS_SIZE, 560), height: Math.min(CANVAS_SIZE, 560) }}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseLeave={() => setHovered(null)}
                                onClick={handleCanvasClick}
                                className="cursor-pointer"
                            />
                        )}
                    </div>

                    <div className={`w-64 shrink-0 border-l ${isLightMode ? 'border-neutral-200' : 'border-neutral-800'} p-4 overflow-y-auto space-y-4`}>
                        {chains.length > 1 && (
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-wider ${subtleText}`}>{t.ramachandranChain as string}</label>
                                <select
                                    value={selectedChain}
                                    onChange={(e) => setSelectedChain(e.target.value)}
                                    className={`w-full mt-1 text-sm rounded-lg px-2 py-1.5 outline-none ${panelBg} ${isLightMode ? 'text-black' : 'text-white'}`}
                                >
                                    <option value="All">{t.allChains as string}</option>
                                    {chains.map(c => <option key={c} value={c}>{t.chainLabel as string} {c}</option>)}
                                </select>
                            </div>
                        )}

                        <div className={`rounded-lg p-3 ${panelBg} space-y-1.5`}>
                            <div className="flex items-center justify-between text-xs">
                                <span className={subtleText}>{t.ramachandranResidues as string}</span>
                                <span className="font-mono font-bold">{plottable.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className={subtleText}>{t.ramachandranOutliers as string}</span>
                                <span className={`font-mono font-bold ${outliers.length > 0 ? 'text-red-500' : ''}`}>
                                    {outliers.length} ({plottable.length ? ((outliers.length / plottable.length) * 100).toFixed(1) : '0.0'}%)
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#38bdf8' }} />{t.ramachandranLegendGeneral as string}</div>
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#34d399' }} />{t.ramachandranLegendGly as string}</div>
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#fb923c' }} />{t.ramachandranLegendPro as string}</div>
                            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#ef4444' }} />{t.ramachandranLegendOutlier as string}</div>
                        </div>

                        {outliers.length > 0 && (
                            <div>
                                <button
                                    onClick={() => setShowOutliers(!showOutliers)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline"
                                >
                                    <AlertTriangle className="w-3 h-3" />
                                    {showOutliers ? (t.ramachandranHideList as string) : (t.ramachandranShowList as string)}
                                </button>
                                {showOutliers && (
                                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                                        {outliers.map((p, i) => (
                                            <button
                                                key={`${p.chain}-${p.resNo}-${i}`}
                                                onClick={() => onHighlightResidue && onHighlightResidue(p.chain, p.resNo)}
                                                className={`w-full text-left text-[11px] font-mono px-2 py-1 rounded transition-colors ${isLightMode ? 'hover:bg-neutral-100' : 'hover:bg-white/10'}`}
                                            >
                                                {p.resName}{p.resNo}:{p.chain}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <p className={`text-[10px] leading-relaxed ${subtleText}`}>
                            {t.ramachandranDisclaimer as string}
                        </p>
                    </div>
                </div>
            </div>

            {hovered && (
                <div
                    className="fixed z-[70] pointer-events-none px-2.5 py-1.5 rounded-lg text-xs font-mono bg-black/90 text-white shadow-xl"
                    style={{ left: hovered.x + 14, top: hovered.y + 14 }}
                >
                    {hovered.point.resName}{hovered.point.resNo}:{hovered.point.chain} — φ {hovered.point.phi?.toFixed(1)}°, ψ {hovered.point.psi?.toFixed(1)}°
                </div>
            )}
        </div>
    );
};
