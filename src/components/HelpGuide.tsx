import React, { useState } from 'react';
import {
    CircleHelp, X, MousePointer2, Keyboard, Sparkles,
    BookOpen, Layers, Activity, Share2, FileUp, ArrowLeft, Palette, Mail, Github, MessageSquare, ExternalLink, Linkedin, Heart, Users, Video, Shapes, LayoutDashboard, PenTool, Bot, FolderOpen, FlaskConical
} from 'lucide-react';

type FeatureSection = {
    id: string;
    title: string;
    icon: any;
    description: string;
    content: React.ReactNode;
};

export const HelpGuide: React.FC<{ isVisible?: boolean, isLightMode?: boolean, hasSequence?: boolean, isMolStarActive?: boolean, isMolStarSidebarExpanded?: boolean, isAiChatOpen?: boolean }> = ({ isVisible = true, isLightMode = false, hasSequence = false, isMolStarActive = false, isMolStarSidebarExpanded = true, isAiChatOpen = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('start');
    const [showMobileList, setShowMobileList] = useState(true);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) setIsOpen(false);
            if ((e.key === '?' || e.key === '/') && !isOpen) {
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
                setActiveTab('shortcuts');
                setIsOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const features: FeatureSection[] = [
        {
            id: 'start',
            title: 'Getting Started',
            icon: BookOpen,
            description: 'Load structures and navigate the 3D viewer.',
            content: (
                <div className="space-y-5">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <FileUp className="w-4 h-4 text-blue-400" /> Loading Structures
                        </h4>
                        <ul className="space-y-3 text-xs text-neutral-300">
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono shrink-0">01</span>
                                <span><strong className="text-white block">RCSB PDB</strong>Enter a 4-character PDB ID (e.g., <code className="bg-neutral-800 px-1 rounded">2B3P</code>) in the sidebar search and click Load.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono shrink-0">02</span>
                                <span><strong className="text-white block">PubChem</strong>Switch to the PubChem tab and enter a compound CID (e.g., <code className="bg-neutral-800 px-1 rounded">2244</code>) to load small molecules.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono shrink-0">03</span>
                                <span><strong className="text-white block">Curated Library</strong>Click <strong className="text-neutral-200">Library</strong> in the sidebar to browse 200+ hand-picked proteins and chemicals across 24 categories (enzymes, viral, antibodies, drug targets, DNA/RNA, neurotransmitters, and more).</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono shrink-0">04</span>
                                <span><strong className="text-white block">Local Files</strong>Drag and drop <code className="text-blue-300">.pdb</code>, <code className="text-blue-300">.cif</code>, <code className="text-blue-300">.mmcif</code>, <code className="text-blue-300">.sdf</code>, or <code className="text-blue-300">.mol</code> files anywhere on the screen, or use the Upload button.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono shrink-0">05</span>
                                <span><strong className="text-white block">My Library</strong>Logged-in users can save structures to their personal cloud library and reload them from any device via the Dashboard.</span>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <MousePointer2 className="w-4 h-4 text-purple-400" /> 3D Navigation
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                                ['Rotate', 'Left Click + Drag'],
                                ['Zoom', 'Scroll Wheel'],
                                ['Pan', 'Right Click + Drag'],
                                ['Toggle Spin', 'Space'],
                                ['Reset View', 'R'],
                                ['Select Residue', 'Click atom in 3D'],
                                ['Measure Distance', 'M → click two atoms'],
                                ['Command Palette', '⌘K / Ctrl+K'],
                            ].map(([label, action]) => (
                                <div key={label} className="bg-black/20 p-2 rounded border border-white/5">
                                    <strong className="text-white block mb-0.5">{label}</strong>
                                    <span className="text-neutral-400">{action}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" /> HUD &amp; Structure Info
                        </h4>
                        <div className="space-y-2 text-xs text-neutral-300">
                            <p>The heads-up display (HUD) overlaid on the viewer shows the loaded structure's name or PDB ID. Hover over any atom to see the residue name, number, chain, and atom type in real time.</p>
                            <p>During collaboration sessions the HUD also shows participant names, voice status, and control indicators.</p>
                        </div>
                    </div>
                    <div className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700/50">
                        <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-neutral-400" /> Interactive Onboarding Tour
                        </h4>
                        <p className="text-[11px] text-neutral-400">Click <strong className="text-neutral-300">Start Tour</strong> on the landing screen for a step-by-step guided walkthrough that highlights the 3D viewer, loading, visualization controls, multi-view layouts, and analysis tools.</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <strong className="text-blue-400 text-xs block mb-1">Pro Tips</strong>
                        <p className="text-[11px] text-neutral-400">Press <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">?</kbd> anywhere to toggle this guide. Press <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">Esc</kbd> to close any modal. Open the Command Palette with <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">⌘K</kbd> to search and run any action by name.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'dashboard',
            title: 'Integrated Dashboard',
            icon: LayoutDashboard,
            description: 'Your personal research hub — structures, analytics, and settings.',
            content: (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <LayoutDashboard className="w-4 h-4 text-cyan-400" /> Your Research Hub
                        </h4>
                        <p className="text-xs text-neutral-300 mb-3 leading-relaxed">Access the dashboard via the <strong className="text-white">Dashboard</strong> button in the top-right corner. It opens your personal workspace while preserving the current viewer state.</p>
                        <div className="space-y-2">
                            {[
                                ['Overview', 'Activity sparklines (uploads, views, shares, deletes) over the last 14 days with 7-day trend indicators. Highlights top structures by view count and shows a scrollable recent activity feed.'],
                                ['My Structures', 'Cloud library of all your uploaded structures. Toggle between grid and list view. Sort by date, size, or name. Filter and tag structures (Protein, Ligand, Drug Target, Published, In Progress, Mutant, Control, Complex). Organize into color-coded folders, star for quick access, or bulk-export as ZIP.'],
                                ['Lab Notebook', 'A full scientific notebook with rich-text editing, spreadsheet tables, inline charts, code cells, and PDF export — all cloud-synced with real-time collaboration cursors.'],
                                ['Studio Drafts', 'Resume or export your saved molecular animation projects from Studio Mode. Each draft shows title, duration, frame count, and creation date.'],
                                ['Account Settings', 'Manage your profile name, avatar/picture upload, password, and security preferences.'],
                            ].map(([title, desc]) => (
                                <div key={title as string} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <strong className="text-white text-xs block mb-1">{title}</strong>
                                    <p className="text-[11px] text-neutral-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                        <strong className="text-cyan-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">The <strong className="text-neutral-300">Open Viewer</strong> button in the dashboard header returns you to the exact structure and viewer state you left.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'lab-notebook',
            title: 'Lab Notebook',
            icon: PenTool,
            description: 'Rich-text notes, tables, charts, code cells, and PDF export.',
            content: (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-amber-400" /> Scientific Notebook
                        </h4>
                        <p className="text-xs text-neutral-300 mb-3 leading-relaxed">A full-featured research notebook with cloud sync, auto-save, and real-time collaboration cursors. Access it from the Dashboard → Lab Notebook tab.</p>
                        <div className="space-y-2">
                            {[
                                ['Rich Text Editor', 'Bold, italic, underline, strikethrough, headings (H1–H3), bullet and numbered lists, blockquotes, code blocks (use ```python fence syntax), links, subscript, superscript, text highlights, and custom text color. Select any text to reveal the floating formatting toolbar.'],
                                ['Spreadsheet Tables', 'Inline editable spreadsheet with column letter headers and row numbers. Download as CSV, view column statistics (min, max, mean, σ) via the Activity button, adjust font size, and manage columns/rows via the Settings (⚙) menu.'],
                                ['Inline Charts', 'Click Visualize in the table toolbar to link a table to a chart block. Choose Line or Bar chart, select X-axis and Y-axis columns, assign per-series colors, and optionally overlay a trend line (linear regression) or show mean/σ statistics. The chart auto-syncs when table data changes.'],
                                ['Code Cells', 'Python-style executable math cells for scientific calculations directly inside your notes.'],
                                ['Structure Mentions', 'Type @ to mention a structure from your library. It embeds a clickable reference badge that opens the structure in the viewer.'],
                                ['Chemical Sketcher', 'Draw and embed 2D chemical structures using the built-in Ketcher-powered sketcher. Insert via the toolbar.'],
                                ['Image Embedding', 'Paste or drag images directly into the editor. Resize by dragging the corner handle.'],
                                ['Floating Calculator', 'Insert a scientific calculator widget from the Insert menu for quick in-note calculations without leaving the page.'],
                                ['PDF Export', 'Export any notebook entry as a multi-page PDF with an auto-generated cover page from the toolbar.'],
                            ].map(([title, desc]) => (
                                <div key={title as string} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <strong className="text-white text-xs block mb-1">{title}</strong>
                                    <p className="text-[11px] text-neutral-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <strong className="text-amber-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Select text to reveal the floating formatting toolbar. Use the <strong className="text-neutral-300">Insert</strong> menu in the main toolbar to add tables, charts, calculators, chemical structures, and more.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'ai',
            title: 'Quercus AI',
            icon: Bot,
            description: 'Context-aware AI assistant for structures and data analysis.',
            content: (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Bot className="w-4 h-4 text-indigo-400" /> AI-Powered Analysis
                        </h4>
                        <p className="text-xs text-neutral-300 mb-3 leading-relaxed">Click the <strong className="text-white">AI</strong> button in the bottom pill (sign-in required) to open the Quercus AI assistant, powered by Claude.</p>
                        <div className="space-y-2">
                            {[
                                ['Structure Context', 'When a structure is loaded, Quercus AI automatically receives its PDB ID, name, organism, method, resolution, formula, and molecular weight — no copy-pasting needed.'],
                                ['Ask Anything', 'Ask about protein function, binding sites, mutations, drug interactions, structural features, or AlphaFold confidence scores.'],
                                ['File Attachments', 'Attach images, PDFs, CSV, or TSV files (up to 5 per message) by clicking the paperclip icon or dragging files directly into the AI panel.'],
                                ['Data Analysis', 'Upload experimental data tables and ask the AI to interpret, summarize, find patterns, or suggest statistical approaches.'],
                                ['Streaming Responses', 'Responses stream in real-time token by token. Use Shift+Enter to insert a new line without sending.'],
                            ].map(([title, desc]) => (
                                <div key={title as string} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <strong className="text-white text-xs block mb-1">{title}</strong>
                                    <p className="text-[11px] text-neutral-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <strong className="text-indigo-400 text-xs block mb-1">Mobile</strong>
                        <p className="text-[11px] text-neutral-400">On phones the AI panel opens as a bottom sheet, so the structure remains visible above it.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'layout',
            title: 'Multi-View & Layout',
            icon: Layers,
            description: 'Compare up to 4 structures simultaneously with independent viewports.',
            content: (
                <div className="space-y-5">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-400" /> Multi-Viewport System
                        </h4>
                        <p className="text-xs text-neutral-300 mb-3 leading-relaxed">Use the layout buttons at the bottom of the left sidebar to switch between 1, 2, 3, or 4 simultaneous viewports. Each viewport is fully independent — load different structures, use different representations and coloring schemes.</p>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            {[
                                ['Single', 'Full-width single structure view'],
                                ['Dual (Side-by-Side)', 'Compare two structures or two representations of the same structure'],
                                ['Triple', 'One large main viewport + two smaller ones'],
                                ['Quad Grid', 'Four equal viewports for multi-conformer or multi-mutant analysis'],
                            ].map(([label, desc]) => (
                                <div key={label} className="bg-black/20 p-2 rounded border border-white/5">
                                    <strong className="text-white block mb-0.5 text-[11px]">{label}</strong>
                                    <span className="text-neutral-500 text-[10px]">{desc}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                            <strong className="text-white text-xs block mb-1">Rendering Engines</strong>
                            <p className="text-[11px] text-neutral-400">Switch between <strong className="text-neutral-300">NGL</strong> (default, fast, broad format support) and <strong className="text-neutral-300">Mol*</strong> (feature-rich, advanced selections and ligand environments) using the engine buttons at the bottom of the sidebar.</p>
                        </div>
                    </div>
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <strong className="text-indigo-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Load the same PDB in two viewports with different representations (e.g., Cartoon vs. Surface) to compare structural features at a glance without switching back and forth.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'live',
            title: 'Live Collaboration',
            icon: Users,
            description: 'Real-time multi-user sessions with voice, chat, and reactions.',
            content: (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-green-400" /> Real-Time Sessions
                        </h4>
                        <p className="text-xs text-neutral-300 mb-3 leading-relaxed">Turn Quercus Viewer into a shared lab bench. Everyone in the session sees the same structure, camera, and annotations in real time — no account required for guests.</p>
                        <div className="space-y-2">
                            {[
                                ['Start a Session', 'Click Share → Live tab. Copy the invite link and send it to collaborators. They join by opening the link — no account required.'],
                                ['What Syncs in Real Time', 'Camera rotation and zoom, representation changes, coloring updates, measurement additions, structure loads, and residue hover highlights all sync instantly to all participants.'],
                                ['Pass the Chalk', 'The host controls the view by default. Click a participant\'s nametag in the HUD to transfer control to them. Guests can switch to View-only mode to unlock their own camera.'],
                                ['Voice Chat', 'Click JOIN VOICE in the bottom pill to join the WebRTC audio room. Mute/unmute without leaving the session.'],
                                ['Text Chat', 'The CHAT button (visible during sessions) opens a real-time message thread. System events (structure loaded, user joined) appear automatically.'],
                                ['Emoji Reactions', 'Click 👍 ❤️ 👏 🎉 in the HUD to broadcast an animated reaction over the viewer for all participants — great for celebrating a discovery.'],
                                ['Quick Notes', 'The NOTES button opens a local floating notepad above the viewer, useful for jotting observations during a session. Notes are local only.'],
                            ].map(([title, desc]) => (
                                <div key={title as string} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <strong className="text-white text-xs block mb-1">{title}</strong>
                                    <p className="text-[11px] text-neutral-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <strong className="text-green-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Guests can switch to View-only mode in the HUD to unlock their own camera and freely explore the structure while still watching the host's highlights and measurements.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'data',
            title: 'History & Favorites',
            icon: FolderOpen,
            description: 'Favorites, recent history, and the curated structure library.',
            content: (
                <div className="space-y-4">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5"><span className="text-yellow-400">★</span> Favorites</h4>
                                <p className="text-[11px] text-neutral-400">Click the star next to any loaded structure name to save it for quick re-access from the Favorites panel in the sidebar.</p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h4 className="text-xs font-bold text-white mb-1">🕒 History</h4>
                                <p className="text-[11px] text-neutral-400">The last 10 viewed structures are remembered locally so you can resume exactly where you left off.</p>
                            </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg border border-white/5 mb-3">
                            <strong className="text-white text-xs block mb-1">My Structures (Dashboard)</strong>
                            <p className="text-[11px] text-neutral-400">Your personal cloud-synced library. Features grid/list view toggle, sorting by date/size/name, tag filtering (Protein, Ligand, Drug Target, Mutant, In Progress…), color-coded folder organization, starring, bulk ZIP export, and per-structure sharing links.</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                            <strong className="text-white text-xs block mb-2">Curated Library</strong>
                            <p className="text-[11px] text-neutral-400 mb-2">200+ hand-picked proteins and chemicals across 24 categories:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {['Enzymes', 'Viral', 'Immune', 'Antibodies', 'Drug Targets', 'DNA/RNA', 'Vitamins', 'Drugs', 'Neurotransmitters', 'Metabolites'].map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-neutral-700 rounded text-[10px] text-neutral-300">{tag}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <strong className="text-yellow-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Save a structure to your library with <strong className="text-neutral-300">Save to Library</strong> in the left sidebar, then tag and annotate it in the Dashboard for future reference and sharing.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'visuals',
            title: 'Visualization',
            icon: Sparkles,
            description: 'Representations, rendering engines, quality, and clipping.',
            content: (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-400" /> Representations</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            {[
                                ['1 · Cartoon', 'Ribbons showing secondary structure — best default'],
                                ['2 · Spacefill', 'CPK van der Waals spheres'],
                                ['3 · Surface', 'Solvent-accessible surface for pocket analysis'],
                                ['4 · Licorice', 'Bonds only — good for ligands'],
                                ['5 · Backbone', 'Cα trace only, minimal detail'],
                                ['6 · Ribbon', 'Smooth ribbon variant — great for presentations'],
                                ['7 · Ball & Stick', 'Atoms + bonds — ideal for active sites'],
                                ['8 · Line', 'Minimal wireframe — fastest for large structures'],
                            ].map(([label, desc]) => (
                                <div key={label} className="bg-black/20 p-2 rounded border border-white/5">
                                    <strong className="text-white block mb-0.5">{label}</strong>
                                    <span className="text-neutral-500 text-[10px]">{desc}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Rendering Quality</strong>
                                <p className="text-[11px] text-neutral-400">Choose <strong className="text-neutral-300">Low / Medium / High</strong> quality in the sidebar. Enable <strong className="text-neutral-300">SSAO</strong> (Screen Space Ambient Occlusion) for depth shading that makes large structures easier to read. Adjust the <strong className="text-neutral-300">Clip</strong> slider to slice through the structure at any depth and reveal internal cavities or binding pockets.</p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Rendering Engines</strong>
                                <p className="text-[11px] text-neutral-400">Switch between <strong className="text-neutral-300">NGL</strong> (fast, great default) and <strong className="text-neutral-300">Mol*</strong> (advanced ligand analysis, custom selections) at the bottom of the sidebar.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <strong className="text-purple-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Use keyboard shortcuts <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">1</kbd>–<kbd className="bg-neutral-800 px-1 rounded text-neutral-300">8</kbd> to switch representations instantly without touching the sidebar.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'coloring',
            title: 'Coloring',
            icon: Palette,
            description: 'Color schemes, custom rules, per-chain colors, and transparency.',
            content: (
                <div className="space-y-4">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-pink-400" /> Color Schemes</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                            {[
                                ['By Chain', 'Each chain a distinct color (Q)'],
                                ['By Element', 'CPK standard coloring (W)'],
                                ['Hydrophobicity', 'Polarity gradient (E)'],
                                ['B-Factor / pLDDT', 'Flexibility or AlphaFold confidence (A)'],
                                ['Secondary Structure', 'Helix/sheet/loop coloring (D)'],
                                ['Charge', 'Electrostatic charge (Z)'],
                                ['Rainbow / Spectrum', 'N→C terminus gradient (X)'],
                                ['Residue Name', 'Amino acid identity (V)'],
                            ].map(([label, key]) => (
                                <div key={label} className="bg-black/20 p-2 rounded border border-white/5 flex justify-between items-center">
                                    <span className="text-neutral-300 text-[11px]">{label}</span>
                                    <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-[10px] text-neutral-500">{key.match(/\((\w)\)/)?.[1]}</kbd>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Custom Color Rules</strong>
                                <p className="text-[11px] text-neutral-400">In the Colors panel, add rules targeting a specific chain + residue range and assign any color. Enter comma-separated residue numbers (<code className="bg-neutral-900 px-1 rounded">10,15,42</code>) or ranges (<code className="bg-neutral-900 px-1 rounded">20-50</code>) to highlight discontinuous active site residues. Residue rules override chain rules, which override the global scheme.</p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Transparency</strong>
                                <p className="text-[11px] text-neutral-400">Set per-chain or per-residue opacity in the Transparency section. Combine Surface at 50% opacity with Cartoon underneath to see internal structure through the volume — useful for visualizing buried active sites.</p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Background Color</strong>
                                <p className="text-[11px] text-neutral-400">Use the color picker in the sidebar to set a custom viewer background. Dark blue works well for presentations; pure black for publications.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                        <strong className="text-pink-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Layer transparency and custom rules: Surface at 30% opacity on Chain A, with residues 50–60 highlighted in red Ball & Stick for a figure that shows both the protein surface and the active site at once.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'advanced-styles',
            title: 'Advanced Styles',
            icon: Shapes,
            description: 'Per-chain and per-residue representation mixing.',
            content: (
                <div className="space-y-4">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Shapes className="w-4 h-4 text-purple-400" /> Layered Styling</h4>
                        <p className="text-xs text-neutral-300 mb-3">Apply different representations to specific parts of the structure without affecting the rest. Build complex scientific figures by layering styles at the global, chain, and residue level.</p>
                        <div className="space-y-2">
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-purple-500/20 text-purple-400 rounded text-[10px]">1</span>Global Style
                                </h5>
                                <p className="text-[11px] text-neutral-400 ml-6">The global representation (keys 1–8) applies to the entire structure as a base.</p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded text-[10px]">2</span>Per-Chain Styles
                                </h5>
                                <p className="text-[11px] text-neutral-400 ml-6">Choose a chain and set its representation independently. <em className="text-neutral-500">Example: Chain A as Surface, Chain B as Licorice — useful for protein-ligand complexes.</em></p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-pink-500/20 text-pink-400 rounded text-[10px]">3</span>Per-Residue Styles
                                </h5>
                                <p className="text-[11px] text-neutral-400 ml-6">Target a residue range within a chain. <em className="text-neutral-500">Example: Residues 50–60 as Ball &amp; Stick to highlight the active site over a Cartoon background.</em></p>
                            </div>
                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                <div className="flex gap-2">
                                    <Layers className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="text-purple-400 text-xs block mb-0.5">Priority Order</strong>
                                        <p className="text-[10px] text-neutral-400">Residue style &gt; Chain style &gt; Global style. Higher specificity always wins.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'tools',
            title: 'Analysis & Tools',
            icon: FlaskConical,
            description: 'Measurements, sequence track, superposition, contact maps, and motif search.',
            content: (
                <div className="space-y-4">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3">Structural Analysis Tools</h4>
                        <div className="space-y-2">
                            {[
                                ['Distance Measurements (M)', 'Press M (or click the ruler icon) to enter measurement mode, then click any two atoms to measure their distance in Ångströms. Name, recolor, or delete individual measurements in the Measurements panel. Export all measurements with chain, residue, and atom metadata as CSV.'],
                                ['Sequence Track', 'The right-side panel shows the full residue sequence for each chain. Click any residue to select and highlight it in 3D. Color the track by hydrophobicity, B-factor, or secondary structure. Secondary structure elements (helices, sheets) appear as colored bars at the top of the track.'],
                                ['Sequence Alignment', 'Open the Superposition panel → Alignment tab to align two chains using Smith-Waterman. View identity %, similarity %, gap count, and RMSD side-by-side. Export as FASTA, Clustal, or Stockholm format, or generate a formatted PDF alignment report.'],
                                ['Structure Superposition', 'Open the Superposition panel to overlay additional structures (by PDB ID or file upload) on the current view. Each overlay gets its own color. Visualize RMSD deviation at a glance by comparing the traces.'],
                                ['Contact Map (C)', 'Press C or open from the sidebar to view an interactive 2D residue-residue distance heatmap. Click any cell to highlight that contact in 3D. Zoom with the scroll wheel, pan by dragging. Filter by contact threshold (default 5 Å), chain, or interaction type: hydrophobic, salt bridge, disulfide, or π-stacking. A mini-map shows your current viewport within the full map.'],
                                ['Motif Search', 'Search for PROSITE-style sequence patterns or secondary structure motifs within the loaded structure. Matches are automatically highlighted in the 3D view.'],
                                ['Chemical Properties', 'When a PubChem structure is loaded, expand the Chemical Properties panel in the sidebar to view SMILES string, XLogP (lipophilicity), H-bond donors/acceptors, rotatable bond count, and heavy atom count.'],
                            ].map(([title, desc]) => (
                                <div key={title as string} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <strong className="text-white text-xs block mb-1">{title}</strong>
                                    <p className="text-[11px] text-neutral-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-neutral-500/10 border border-neutral-500/20 rounded-lg">
                        <strong className="text-neutral-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Press <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">M</kbd> to toggle measurement mode and <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">C</kbd> to toggle the contact map from anywhere — no need to open the sidebar.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'settings',
            title: 'Personalization',
            icon: Activity,
            description: 'Theme, accessibility, clean mode, and rendering appearance.',
            content: (
                <div className="space-y-4">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3">Appearance &amp; Accessibility</h4>
                        <div className="space-y-2">
                            {[
                                ['Theme', 'Cycle between Light, Dark, and Dark-Room modes using the sun/moon icon in the top-right corner of both the viewer and the dashboard. Dark-Room minimizes brightness for microscopy environments.'],
                                ['OpenDyslexic Font', 'Toggle the Dyslexic button in the sidebar to switch to OpenDyslexic — a typeface specifically designed to reduce common reading errors and improve readability.'],
                                ['Background Color', 'Use the color picker in the sidebar to set a custom viewer background. Dark blue works well for presentations; pure black for publications and figures.'],
                                ['Clean Mode', 'Click the eye icon in the sidebar to hide all UI elements, leaving only the 3D structure. Ideal for screenshots, screencasts, or conference presentations.'],
                                ['Rendering Quality', 'Choose Low / Medium / High rendering quality in the sidebar. Low is useful for large assemblies; High for publication screenshots.'],
                                ['SSAO', 'Enable Screen Space Ambient Occlusion for depth shading that makes large multi-chain structures significantly easier to read.'],
                                ['Clipping Planes', 'Enable the clip slider in the sidebar to slice through the structure at any depth — revealing internal cavities, binding pockets, or transmembrane regions.'],
                            ].map(([title, desc]) => (
                                <div key={title as string} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <strong className="text-white text-xs block mb-1">{title}</strong>
                                    <p className="text-[11px] text-neutral-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                        <strong className="text-white text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Enable Clean Mode + custom dark background + screenshot at 4× resolution for publication-quality figures with a transparent alpha channel.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'export',
            title: 'Export & Share',
            icon: Share2,
            description: 'Screenshots, gallery, share links, embeds, and Studio animations.',
            content: (
                <div className="space-y-4">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-2">Screenshots</h4>
                        <p className="text-xs text-neutral-400 mb-2">Press <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">S</kbd> or click the camera icon to export a PNG. Choose resolution and toggle transparent background. Multi-viewport snapshots let you capture any combination of active viewports at once.</p>
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] mb-3">
                            {[['1×', 'Screen res'], ['2×', 'Presentations'], ['4×', '300 DPI print'], ['8×', 'Poster/large']].map(([res, label]) => (
                                <div key={res} className="bg-black/20 p-2 rounded border border-white/5">
                                    <strong className="text-white block">{res}</strong>
                                    <span className="text-neutral-500">{label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                            <strong className="text-white text-xs block mb-1">Gallery</strong>
                            <p className="text-[11px] text-neutral-400">Open the Gallery to browse all your saved snapshots and Studio animations in one place. Filter by type (all / snapshots / movies), preview, or download any entry.</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Video className="w-4 h-4 text-pink-400" /> Studio Mode</h4>
                        <p className="text-xs text-neutral-300 mb-3">Create molecular animations using a timeline non-linear editor (NLE). Add keyframes for camera movements, representation transitions, and representation changes. Attach an audio track. Export as HD video or save as a draft to resume later.</p>
                        <div className="flex flex-wrap gap-2 text-[10px]">
                            {['Keyframe Animation', 'Camera Movements', 'Representation Transitions', 'Audio Tracks', 'HD Video Export', 'Timeline NLE', 'Save Drafts'].map(f => (
                                <span key={f} className="flex items-center gap-1 text-neutral-400"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />{f}</span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Share2 className="w-4 h-4 text-indigo-400" /> Sharing</h4>
                        <div className="space-y-2">
                            {[
                                ['Share Link', 'Generates a URL that reconstructs the exact structure and viewer state. Choose which viewports to include. A QR code is generated automatically.'],
                                ['Embed Widget', 'Get an <iframe> snippet to embed an interactive viewer into your website, paper supplementary, or blog. Options include: auto-spin, show/hide controls, dark/light theme, scroll protection, border radius, drop shadow, transparent background, and custom dimensions.'],
                                ['Live Session Link', 'Share a real-time collaboration link from Share → Live tab. Anyone who opens it joins your live session instantly — no account needed.'],
                                ['Sequence Export', 'Export aligned sequences as FASTA, Clustal, or Stockholm format from the Sequence Alignment panel.'],
                                ['Measurements CSV', 'Export all distance measurements with chain, residue, and atom metadata from the Measurements panel.'],
                            ].map(([title, desc]) => (
                                <div key={title as string} className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                                    <strong className="text-white text-xs block mb-0.5">{title}</strong>
                                    <p className="text-[10px] text-neutral-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <strong className="text-rose-400 text-xs block mb-1">Pro Tip</strong>
                        <p className="text-[11px] text-neutral-400">Screenshots include a transparent alpha channel by default when no custom background color is set — ready for compositing in Illustrator, Figma, or PowerPoint.</p>
                    </div>
                </div>
            )
        },
        {
            id: 'shortcuts',
            title: 'Shortcuts',
            icon: Keyboard,
            description: 'Complete keyboard reference.',
            content: (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="col-span-2 pb-1 mb-1 border-b border-neutral-800 font-bold text-neutral-400 uppercase tracking-widest text-[10px]">General</div>
                    <div className="flex justify-between text-neutral-300"><span>Help Guide</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">?</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Command Palette</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">⌘K</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Screenshot</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">S</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Close Modal</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">Esc</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Undo</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">⌘Z</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Redo</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">⇧⌘Z</kbd></div>

                    <div className="col-span-2 pb-1 mb-1 mt-3 border-b border-neutral-800 font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Viewer Controls</div>
                    <div className="flex justify-between text-neutral-300"><span>Reset View</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">R</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Toggle Spin</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">Space</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Measure Mode</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">M</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Contact Map</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">C</kbd></div>

                    <div className="col-span-2 pb-1 mb-1 mt-3 border-b border-neutral-800 font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Representations</div>
                    <div className="flex justify-between text-neutral-300"><span>Cartoon</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">1</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Spacefill</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">2</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Surface</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">3</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Licorice</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">4</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Backbone</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">5</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Ribbon</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">6</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Ball+Stick</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">7</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Line</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">8</kbd></div>

                    <div className="col-span-2 pb-1 mb-1 mt-3 border-b border-neutral-800 font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Coloring</div>
                    <div className="flex justify-between text-neutral-300"><span>By Chain</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">Q</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>By Element</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">W</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Hydrophobicity</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">E</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>B-Factor / pLDDT</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">A</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Secondary Structure</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">D</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Charge</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">Z</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Rainbow</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">X</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Residue Name</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">V</kbd></div>
                </div>
            )
        },
        {
            id: 'contact',
            title: 'Contact & Feedback',
            icon: MessageSquare,
            description: 'Report bugs, request features, or say hi.',
            content: (
                <div className="space-y-6">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3">We'd love to hear from you!</h4>
                        <p className="text-xs text-neutral-300 mb-6">
                            Have a suggestion, found a bug, or just want to say hi? Reach out through any of the channels below.
                        </p>

                        <div className="space-y-3">
                            <a
                                href="mailto:codequercus@gmail.com"
                                className="group flex items-center gap-4 p-3 rounded-xl border border-neutral-700/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200"
                            >
                                <div className="p-2.5 rounded-lg bg-blue-900/20 text-blue-400 group-hover:scale-110 transition-transform">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-neutral-200 group-hover:text-white">Send an Email</h3>
                                    <p className="text-[11px] mt-0.5 text-neutral-500 group-hover:text-neutral-400">
                                        codequercus@gmail.com — questions, feedback, or collaboration
                                    </p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-neutral-600 group-hover:text-blue-400 transition-colors" />
                            </a>

                            <a
                                href="https://github.com/QuercusCode/QuercusProteinViewer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 p-3 rounded-xl border border-neutral-700/50 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all duration-200"
                            >
                                <div className="p-2.5 rounded-lg bg-purple-900/20 text-purple-400 group-hover:scale-110 transition-transform">
                                    <Github className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-neutral-200 group-hover:text-white">GitHub Issues</h3>
                                    <p className="text-[11px] mt-0.5 text-neutral-500 group-hover:text-neutral-400">
                                        Report bugs or request features
                                    </p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-neutral-600 group-hover:text-purple-400 transition-colors" />
                            </a>

                            <a
                                href="https://www.linkedin.com/in/amir-m-cheraghali-195b23207/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 p-3 rounded-xl border border-neutral-700/50 hover:border-sky-600/50 hover:bg-sky-600/5 transition-all duration-200"
                            >
                                <div className="p-2.5 rounded-lg bg-sky-900/20 text-sky-400 group-hover:scale-110 transition-transform">
                                    <Linkedin className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-neutral-200 group-hover:text-white">LinkedIn Profile</h3>
                                    <p className="text-[11px] mt-0.5 text-neutral-500 group-hover:text-neutral-400">
                                        Connect professionally
                                    </p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                            </a>
                        </div>

                        <div className="mt-8 pt-6 border-t border-neutral-700/50">
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Heart className="w-4 h-4 text-pink-500 fill-pink-500/20" /> Support Development
                            </h4>
                            <p className="text-xs text-neutral-300 mb-4">
                                Quercus Viewer is an open-source project. If you find it useful for your research or education, consider supporting its continued development.
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <a
                                    href="https://buymeacoffee.com/amirmcheraghali"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black text-xs font-bold rounded-lg shadow-lg shadow-yellow-900/10 transition-all hover:scale-105"
                                >
                                    <Heart className="w-3.5 h-3.5 fill-black/20" />
                                    Buy Me a Coffee
                                </a>
                                <a
                                    href="https://github.com/sponsors/QuercusCode"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg border border-neutral-600 shadow-lg transition-all hover:scale-105"
                                >
                                    <Github className="w-3.5 h-3.5" />
                                    GitHub Sponsors
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const activeFeature = features.find(f => f.id === activeTab) || features[0];

    return (
        <>
            {/* Donation Dropdown (Floating next to Help) */}
            <div className={`fixed z-40 group transition-all duration-300 ease-in-out ${isMolStarActive ? (isMolStarSidebarExpanded ? 'bottom-20 right-[380px]' : 'bottom-20 right-[80px]') : `top-4 ${hasSequence ? (isAiChatOpen ? 'right-[396px] md:right-[460px]' : 'right-[76px] md:right-[172px]') : (isAiChatOpen ? 'right-[396px] md:right-[460px]' : 'right-[76px]')}`}`}>
                <button
                    className={`h-10 px-4 rounded-full border shadow-lg backdrop-blur-md transition-all group-hover:bg-neutral-800 group-hover:text-white flex items-center gap-2 ${isLightMode ? 'bg-white/80 text-pink-600 border-black/10' : 'bg-neutral-900/80 text-pink-500 border-white/10'}`}
                >
                    <Heart className={`w-4 h-4 ${isLightMode ? 'fill-pink-100' : 'fill-pink-900/30'}`} />
                    <span className="text-sm font-medium hidden sm:block">Donate</span>
                </button>

                <div className={`absolute right-0 w-48 py-2 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform flex flex-col overflow-hidden ${isMolStarActive ? 'bottom-12 translate-y-[10px] group-hover:translate-y-0' : 'top-12 translate-y-[-10px] group-hover:translate-y-0'}`}>
                    <a
                        href="https://buymeacoffee.com/amirmcheraghali"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors"
                    >
                        <div className="p-1.5 bg-yellow-500/20 rounded-lg text-yellow-400">
                            <Heart className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">Buy Me a Coffee</span>
                            <span className="text-[10px] text-neutral-400">Support widely</span>
                        </div>
                    </a>
                    <a
                        href="https://github.com/sponsors/QuercusCode"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors"
                    >
                        <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400">
                            <Github className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">GitHub Sponsors</span>
                            <span className="text-[10px] text-neutral-400">Monthly support</span>
                        </div>
                    </a>
                </div>
            </div>

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed z-40 h-10 w-10 flex items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 ease-in-out hover:scale-105 group ${isMolStarActive ? (isMolStarSidebarExpanded ? 'bottom-20 right-[330px]' : 'bottom-20 right-[30px]') : `top-4 ${hasSequence ? (isAiChatOpen ? 'right-[344px] md:right-[408px]' : 'right-[24px] md:right-[120px]') : (isAiChatOpen ? 'right-[344px] md:right-[408px]' : 'right-[24px]')}`} ${isLightMode ? 'bg-white/80 text-neutral-600 hover:text-blue-600 border-black/10 hover:bg-white' : 'bg-neutral-900/80 text-neutral-400 hover:text-white border-white/10'}`}
                title="Viewer Controls & Help"
            >
                <CircleHelp className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>

            {/* Modal Overlay */}
            {
                isOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="relative w-full max-w-5xl h-[85vh] flex flex-col md:flex-row bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                            {/* Sidebar */}
                            <div className={`w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-900/50 flex-col min-h-0 ${showMobileList ? 'flex' : 'hidden md:flex'}`}>
                                <div className="p-5 border-b border-neutral-800 flex items-start justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <CircleHelp className="w-5 h-5 text-blue-500" />
                                            User Manual
                                        </h2>
                                        <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Quercus Viewer v1.0</p>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="md:hidden p-2 bg-neutral-800 text-neutral-400 hover:text-white rounded-full transition-colors flex items-center justify-center -mr-1 -mt-1"
                                        title="Close Manual"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-neutral-800">
                                    {features.map(feature => (
                                        <button
                                            key={feature.id}
                                            onClick={() => {
                                                setActiveTab(feature.id);
                                                setShowMobileList(false);
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${activeTab === feature.id && !showMobileList
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                                : activeTab === feature.id
                                                    ? 'bg-blue-600/10 text-blue-400 md:bg-blue-600 md:text-white md:shadow-lg'
                                                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <feature.icon className={`w-4 h-4 ${activeTab === feature.id ? 'text-blue-400 md:text-white' : 'text-neutral-500'}`} />
                                            {feature.title}
                                            <div className="flex-1" />
                                            <div className="md:hidden text-neutral-600">→</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-neutral-800 text-center flex justify-between md:justify-center items-center">
                                    <button onClick={() => setIsOpen(false)} className="md:hidden text-xs text-neutral-400 flex items-center gap-1">
                                        <X className="w-3 h-3" /> Close
                                    </button>
                                    <p className="text-[10px] text-neutral-600 hidden md:block">
                                        Press <kbd className="font-mono bg-neutral-800 px-1 rounded text-neutral-400">Esc</kbd> to close
                                    </p>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className={`flex-1 flex-col min-w-0 min-h-0 bg-neutral-900/30 ${showMobileList ? 'hidden md:flex' : 'flex'}`}>
                                {/* Header */}
                                <div className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setShowMobileList(true)}
                                            className="md:hidden p-1.5 -ml-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 active:scale-95 transition-all"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{activeFeature.title}</h3>
                                            <p className="text-sm text-neutral-400 hidden sm:block">{activeFeature.description}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 -mr-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Scrollable Body */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-neutral-700">
                                    <div className="max-w-3xl mx-auto">
                                        <p className="sm:hidden text-sm text-neutral-500 mb-6 pb-4 border-b border-neutral-800/50">
                                            {activeFeature.description}
                                        </p>
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                            {activeFeature.content}
                                        </div>
                                    </div>

                                    {/* Shared Footer Attribution */}
                                    <div className="mt-12 pt-6 border-t border-neutral-800/50 flex flex-col sm:flex-row justify-between items-center opacity-50 hover:opacity-100 transition-opacity gap-4">
                                        <div className="flex gap-4 text-[10px] text-neutral-500">
                                            <a href="https://www.rcsb.org/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">RCSB PDB</a>
                                            <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">PubChem</a>
                                            <a href="http://nglviewer.org/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">NGL Viewer</a>
                                        </div>
                                        <div className="text-[10px] text-neutral-600">
                                            Powered by React & NGL
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )
            }
        </>
    );
};
