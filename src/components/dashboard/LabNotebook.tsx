import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { NotebookPen, Plus, Trash2, Save, FileText, Search, Loader2, X, Menu } from 'lucide-react';
import { listNotebooks, createNotebook, updateNotebook, deleteNotebook } from '../../lib/notebookService';
import type { NotebookEntry } from '../../types';
import { listStructures, type Structure } from '../../lib/structuresService';
import { RichTextEditor } from './RichTextEditor';
import { LabReportTemplate } from './LabReportTemplate';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Share, Calculator } from 'lucide-react';
import { FloatingCalculator } from './FloatingCalculator';

export const LabNotebook: React.FC<{ isDrawer?: boolean }> = ({ isDrawer = false }) => {
    const { user } = useAuth();
    const [notebooks, setNotebooks] = useState<NotebookEntry[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');

    // Editor State
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);
    const [showFloatingCalc, setShowFloatingCalc] = useState(false);

    // Structure Mentions State
    const [allStructures, setAllStructures] = useState<Structure[]>([]);

    const [showDrawerList, setShowDrawerList] = useState(isDrawer);

    useEffect(() => {
        if (!user) return;
        const fetchNotebooks = async () => {
            try {
                setLoading(true);
                const [notebookData, structureData] = await Promise.all([
                    listNotebooks(user.id),
                    listStructures(user.id)
                ]);
                setNotebooks(notebookData);
                setAllStructures(structureData);
                if (notebookData.length > 0 && !activeId) {
                    setActiveId(notebookData[0].id);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchNotebooks();
    }, [user]);

    const handleCreate = async () => {
        if (!user) return;
        try {
            const newEntry = await createNotebook(user.id);
            setNotebooks(prev => [newEntry, ...prev]);
            setActiveId(newEntry.id);
        } catch (err: any) {
            setError(err.message || 'Failed to create notebook');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this notebook entry?")) return;
        try {
            await deleteNotebook(id);
            setNotebooks(prev => prev.filter(n => n.id !== id));
            if (activeId === id) {
                setActiveId(null);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete notebook');
        }
    };

    const activeNotebook = notebooks.find(n => n.id === activeId);

    // Sync local editor state when active notebook changes
    useEffect(() => {
        if (activeNotebook) {
            setEditTitle(activeNotebook.title);
            setEditContent(activeNotebook.content);
            setLastSaved(new Date(activeNotebook.updated_at));
        } else {
            setEditTitle('');
            setEditContent('');
            setLastSaved(null);
        }
    }, [activeId]);

    // Auto-save logic
    const handleEditorChange = (field: 'title' | 'content', value: string) => {
        if (field === 'title') setEditTitle(value);
        if (field === 'content') setEditContent(value);

        // Optimistically update the list view so the sidebar reflects changes immediately
        setNotebooks(prev => prev.map(n => n.id === activeId ? { ...n, [field]: value, updated_at: new Date().toISOString() } : n));

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        setIsSaving(true);
        saveTimeoutRef.current = setTimeout(async () => {
            if (!activeId) return;
            try {
                await updateNotebook(activeId, { [field]: value });
                setLastSaved(new Date());
            } catch (err: any) {
                console.error("Failed to auto-save:", err);
            } finally {
                setIsSaving(false);
            }
        }, 1000); // 1s debounce
    };

    const filteredNotebooks = notebooks.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleExportPDF = async () => {
        const activeNotebook = notebooks.find(n => n.id === activeId);
        if (!activeNotebook) return;
        setIsExporting(true);
        console.log('Starting Multi-page PDF Export:', activeNotebook.title);
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.width = '1000px'; 
        iframe.height = '3000px'; // Taller for multiple pages
        document.body.appendChild(iframe);

        try {
            await new Promise(r => setTimeout(r, 800));
            
            if (reportRef.current) {
                const iframeDoc = iframe.contentWindow?.document;
                if (!iframeDoc) throw new Error('Could not access iframe document');

                const clone = reportRef.current.cloneNode(true) as HTMLElement;
                
                iframeDoc.open();
                iframeDoc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Lab Report Export</title>
                        <style>
                            body { margin: 0; padding: 0; background-color: white; }
                            * { font-family: Georgia, serif; box-sizing: border-box; }
                            .pdf-page { width: 8.27in; height: 11.69in; padding: 1.5in; position: relative; }
                        </style>
                    </head>
                    <body></body>
                    </html>
                `);
                iframeDoc.close();
                iframeDoc.body.appendChild(clone);

                await new Promise(r => setTimeout(r, 800));

                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                // Capture Page 1: Cover
                const page1 = iframeDoc.getElementById('report-page-1');
                if (page1) {
                    const canvas1 = await html2canvas(page1, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        width: 794, 
                        height: 1122,
                    });
                    const imgData1 = canvas1.toDataURL('image/png');
                    pdf.addImage(imgData1, 'PNG', 0, 0, 210, 297);
                    
                    // Add links for Page 1 (usually empty of structure links but good for consistency)
                    addLinksToPdf(page1, pdf, 0);
                }

                // Add Page 2: Content
                const page2 = iframeDoc.getElementById('report-page-2');
                if (page2) {
                    pdf.addPage();
                    const canvas2 = await html2canvas(page2, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        width: 794,
                        height: 1122,
                    });
                    const imgData2 = canvas2.toDataURL('image/png');
                    pdf.addImage(imgData2, 'PNG', 0, 0, 210, 297);
                    
                    // Add interactive links for Page 2
                    addLinksToPdf(page2, pdf, 0);
                }

                pdf.save(`LabReport_${activeNotebook.title.replace(/\s+/g, '_') || 'Untitled'}.pdf`);
                console.log('Multi-page PDF with links saved successfully.');
            }
        } catch (err) {
            console.error('Failed to export PDF:', err);
            alert(`Failed to generate PDF report: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            document.body.removeChild(iframe);
            setIsExporting(false);
        }
    };

    // Helper to add interactive links to the PDF
    const addLinksToPdf = (pageElement: HTMLElement, pdf: jsPDF, yOffset: number) => {
        const links = pageElement.querySelectorAll('.pdf-structure-link');
        const pageRect = pageElement.getBoundingClientRect();
        
        // PDF is 210mm x 297mm. Input canvas/element is 794px x 1122px (at 96dpi)
        // Ratio: 210 / 794 = 0.2645
        const pxToMm = 210 / 794;
        
        links.forEach(link => {
            const rect = link.getBoundingClientRect();
            const relX = (rect.left - pageRect.left) * pxToMm;
            const relY = (rect.top - pageRect.top) * pxToMm + yOffset;
            const relW = rect.width * pxToMm;
            const relH = rect.height * pxToMm;
            
            const url = (link as HTMLAnchorElement).href;
            pdf.link(relX, relY, relW, relH, { url });
        });
    };

    if (!user) return null;

    return (
        <div className={`flex h-full w-full bg-[var(--bg-main)] overflow-hidden text-[var(--text-secondary)] ${isDrawer ? 'border-l border-[var(--border-main)] shadow-2xl' : ''}`}>
            {/* Left Sidebar: List */}
            {(!isDrawer || showDrawerList) && (
                <div className={`${isDrawer ? 'w-full' : 'w-80'} border-r border-[var(--border-main)] bg-[var(--bg-sidebar)]/50 flex flex-col shrink-0 transition-all`}>
                    <div className="p-4 border-b border-[var(--border-main)] space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <NotebookPen className="w-5 h-5 text-blue-400" />
                                {isDrawer ? 'Notes' : 'Lab Notebook'}
                            </h2>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleCreate}
                                    className="p-1.5 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg transition-colors cursor-pointer"
                                    title="New Entry"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                                {isDrawer && activeId && (
                                    <button
                                        onClick={() => setShowDrawerList(false)}
                                        className="p-1.5 hover:bg-[var(--input-bg)] text-[var(--text-muted)] rounded-lg transition-colors"
                                        title="Close List"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search entries..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-[var(--input-bg)]/50 border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-neutral-700 transition-colors"
                            />
                        </div>
                        {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{error}</div>}
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-[var(--text-muted)]">Loading notebooks...</div>
                        ) : filteredNotebooks.length === 0 ? (
                            <div className="p-4 text-center text-sm text-[var(--text-muted)] border border-dashed border-[var(--border-main)] rounded-xl m-2 bg-[var(--bg-main)]/20">
                                No notebook entries found.
                            </div>
                        ) : (
                            filteredNotebooks.map((entry) => (
                                <button
                                    key={entry.id}
                                    onClick={() => {
                                        setActiveId(entry.id);
                                        if (isDrawer) setShowDrawerList(false);
                                    }}
                                    className={`w-full text-left px-3 py-3 rounded-xl transition-all group relative border ${activeId === entry.id
                                        ? 'bg-blue-500/10 border-blue-500/30 text-[var(--text-primary)] shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-[var(--input-bg)]/50 hover:border-[var(--border-main)]/50 text-[var(--text-secondary)]'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-medium truncate pr-6 text-sm">
                                            {entry.title || 'Untitled Entry'}
                                        </h3>
                                        <button
                                            onClick={(e) => handleDelete(e, entry.id)}
                                            className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs opacity-60 truncate">
                                        {entry.content.substring(0, 60) || 'Empty entry...'}
                                    </p>
                                    <p className="text-[10px] opacity-40 mt-2 font-mono">
                                        {new Date(entry.updated_at).toLocaleDateString()}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Right Pane: Editor Shell */}
            {(!isDrawer || !showDrawerList) && (
                <div className="flex-1 flex flex-col bg-[var(--bg-main)] overflow-hidden relative">
                    {activeNotebook ? (
                        <div className={`flex-1 flex flex-col h-full w-full ${isDrawer ? '' : 'max-w-[1440px] mx-auto'}`}>
                            {/* Editor Toolbar */}
                            <div className={`flex items-center justify-between py-4 shrink-0 ${isDrawer ? 'px-4' : 'px-8'}`}>
                                <div className="flex items-center gap-2">
                                    {isDrawer && (
                                        <button
                                            onClick={() => setShowDrawerList(true)}
                                            className="p-1.5 hover:bg-[var(--input-bg)] text-[var(--text-muted)] rounded-lg transition-colors mr-2"
                                            title="View All Notes"
                                        >
                                            <Menu className="w-5 h-5" />
                                        </button>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleExportPDF}
                                            disabled={isExporting}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--input-bg)]/50 hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg text-xs font-medium transition-all"
                                            title="Export as Lab Report (PDF)"
                                        >
                                            {isExporting ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <Share className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Export PDF</span>
                                                </div>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setShowFloatingCalc(!showFloatingCalc)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                                                showFloatingCalc 
                                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                                                    : 'bg-[var(--input-bg)]/50 hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border-main)]'
                                            }`}
                                            title="Toggle Floating Calculator"
                                        >
                                            <Calculator className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Calculator</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[var(--text-muted)]">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                            <span className="hidden sm:inline">Saving...</span>
                                        </>
                                    ) : lastSaved ? (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            <div className={`flex-1 overflow-y-auto ${isDrawer ? 'p-4' : 'px-4 sm:px-12 py-8'} min-h-0`}>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => handleEditorChange('title', e.target.value)}
                                    className={`bg-transparent border-none font-bold font-serif text-[var(--text-primary)] focus:outline-none w-full mb-4 sm:mb-8 placeholder-[var(--text-muted)] ${isDrawer ? 'text-2xl' : 'text-4xl'}`}
                                    placeholder="Title..."
                                />

                                <div className="h-full min-h-[500px] mb-20">
                                    <RichTextEditor 
                                        content={editContent}
                                        onChange={(markdown) => handleEditorChange('content', markdown)}
                                        allStructures={allStructures}
                                        placeholder="Write notes... Type @ to mention a structure..."
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] p-4 text-center">
                            <FileText className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-20" />
                            <p className="text-sm">Select or create a note to start writing.</p>
                            {isDrawer && (
                                <button
                                    onClick={() => setShowDrawerList(true)}
                                    className="mt-4 px-4 py-2 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-lg text-xs"
                                >
                                    View All Notes
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
            {/* Floating Tools */}
            {showFloatingCalc && (
                <FloatingCalculator onClose={() => setShowFloatingCalc(false)} />
            )}

            {/* Hidden PDF Template Container */}
            <div className="fixed top-[-10000px] left-[-10000px] pointer-events-none">
                {activeNotebook && (
                    <LabReportTemplate
                        ref={reportRef}
                        title={editTitle}
                        content={editContent}
                        date={activeNotebook.created_at}
                        author={user?.email || 'Quercus User'}
                        id={activeNotebook.id.slice(0, 8)}
                        allStructures={allStructures}
                    />
                )}
            </div>
        </div>
    );
};
