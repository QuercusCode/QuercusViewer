import React, { useState } from 'react';
import {
    CircleHelp, X, MousePointer2, Keyboard, Sparkles,
    BookOpen, Layers, Activity, Share2, FileUp, ArrowLeft, Wrench, Palette, Mail, Github, MessageSquare, ExternalLink, Linkedin, Heart, Users, Video, Ghost, Shapes
} from 'lucide-react';

type FeatureSection = {
    id: string;
    title: string;
    icon: any;
    description: string;
    content: React.ReactNode;
};

export const HelpGuide: React.FC<{ isVisible?: boolean, isLightMode?: boolean, hasSequence?: boolean, isMolStarActive?: boolean, isMolStarSidebarExpanded?: boolean }> = ({ isVisible = true, isLightMode = false, hasSequence = false, isMolStarActive = false, isMolStarSidebarExpanded = true }) => {
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
            description: 'How to load structures and navigate the interface.',
            content: (
                <div className="space-y-6 intro-slide">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <FileUp className="w-4 h-4 text-blue-400" /> Loading Structures
                            </h4>
                        </div>
                        <ul className="space-y-3 text-xs text-neutral-300">
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono">01</span>
                                <span>
                                    <strong className="text-white block">RCSB PDB</strong>
                                    Enter a 4-character PDB ID (e.g., <code className="bg-neutral-800 px-1 rounded">2B3P</code>) to fetch directly.
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono">02</span>
                                <span>
                                    <strong className="text-white block">PubChem</strong>
                                    Load small molecules by CID (e.g., <code className="bg-neutral-800 px-1 rounded">2244</code>).
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono">03</span>
                                <span>
                                    <strong className="text-white block">Library</strong>
                                    Browse our curated collection of interesting proteins and chemicals.
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono">04</span>
                                <span>
                                    <strong className="text-white block">Local Files</strong>
                                    Drag and drop <code className="text-blue-300">.pdb</code>, <code className="text-blue-300">.sdf</code>, or <code className="text-blue-300">.mol</code> files anywhere on the screen.
                                </span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-neutral-800/50 p-3 rounded-lg flex items-center gap-3 border border-neutral-700/50">
                        <div className="p-2 bg-neutral-700/50 rounded-full">
                            <Sparkles className="w-4 h-4 text-neutral-300" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-white mb-0.5">Interactive Tour</h4>
                            <p className="text-[11px] text-neutral-400">
                                Click "Start Tour" in the sidebar for a guided walkthrough of all features.
                            </p>
                        </div>
                    </div>

                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <MousePointer2 className="w-4 h-4 text-purple-400" /> Controls
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                                <strong className="text-white block mb-1">Rotate</strong>
                                <span className="text-neutral-400">Left Click + Drag</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                                <strong className="text-white block mb-1">Zoom</strong>
                                <span className="text-neutral-400">Scroll Wheel</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                                <strong className="text-white block mb-1">Pan</strong>
                                <span className="text-neutral-400">Right Click + Drag</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                                <strong className="text-white block mb-1">Power User</strong>
                                <span className="text-neutral-400">Cmd+K for Commands</span>
                            </div>
                        </div>
                    </div>


                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <strong className="text-blue-400 text-xs block mb-1">Pro Tip: Quick Access</strong>
                        <p className="text-[11px] text-neutral-400">
                            Press <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">?</kbd> anywhere in the app to toggle this guide instantly.
                        </p>
                    </div>
                </div >
            )
        },
        {
            id: 'layout',
            title: 'Multi-View & Layout',
            icon: Layers,
            description: 'Compare structures side-by-side.',
            content: (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-400" /> Multi-View System
                        </h4>
                        <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
                            Visualize up to 4 structures simultaneously. Perfect for comparing mutants, binding sites, or different conformations.
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-black/20 p-2 rounded border border-white/5 flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-indigo-500/20 border border-indigo-500/50" />
                                <span className="text-white">Single View</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded border border-white/5 flex items-center gap-2">
                                <div className="flex gap-0.5 w-4 h-4"><div className="w-full bg-indigo-500/20 border border-indigo-500/50" /><div className="w-full bg-indigo-500/20 border border-indigo-500/50" /></div>
                                <span className="text-white">Side-by-Side</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded border border-white/5 flex items-center gap-2">
                                <div className="flex flex-col gap-0.5 w-4 h-4"><div className="h-full bg-indigo-500/20 border border-indigo-500/50" /><div className="flex gap-0.5 h-full"><div className="w-full bg-indigo-500/20 border border-indigo-500/50" /><div className="w-full bg-indigo-500/20 border border-indigo-500/50" /></div></div>
                                <span className="text-white">Triple View</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded border border-white/5 flex items-center gap-2">
                                <div className="grid grid-cols-2 gap-0.5 w-4 h-4"><div className="bg-indigo-500/20 border border-indigo-500/50" /><div className="bg-indigo-500/20 border border-indigo-500/50" /><div className="bg-indigo-500/20 border border-indigo-500/50" /><div className="bg-indigo-500/20 border border-indigo-500/50" /></div>
                                <span className="text-white">Quad Grid</span>
                            </div>
                        </div>
                    </div>


                    <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <strong className="text-indigo-400 text-xs block mb-1">Pro Tip: Focus Mode</strong>
                        <p className="text-[11px] text-neutral-400">
                            Need more screen space? Press <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">Cmd+B</kbd> to collapse the sidebar and maximize your viewports.
                        </p>
                    </div>
                </div >
            )
        },
        {
            id: 'live',
            title: 'Live Collaboration',
            icon: Users,
            description: 'Real-time synchronization and chat.',
            content: (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-green-400" /> Remote Teaching & Research
                        </h4>
                        <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
                            Turn your viewer into a shared classroom or lab bench. All participants see exactly what you see, in real-time.
                        </p>

                        <div className="space-y-4">
                            {/* How to Connect */}
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-green-500/20 text-green-400 rounded-full text-[10px]">1</span>
                                    Start a Session
                                </h5>
                                <p className="text-[11px] text-neutral-400 mb-2 ml-6">
                                    Click the <strong className="text-neutral-300">Share</strong> button in the top toolbar. You will be assigned a unique Session ID.
                                </p>
                                <p className="text-[11px] text-neutral-400 ml-6">
                                    Copy the <strong className="text-neutral-300">Invite Link</strong> and send it to your students or colleagues. They just need to open the link to join.
                                </p>
                            </div>

                            {/* What is Synced */}
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded-full text-[10px]">2</span>
                                    What is Synced?
                                </h5>
                                <ul className="ml-6 space-y-1.5 text-[11px] text-neutral-400 list-disc">
                                    <li><strong className="text-neutral-300">Camera View:</strong> When you rotate or zoom, everyone follows.</li>
                                    <li><strong className="text-neutral-300">Representation:</strong> Switch from Cartoon to Surface, and it updates for all.</li>
                                    <li><strong className="text-neutral-300">Measurements:</strong> Distances you measure (M) appear instantly on everyone's screen.</li>
                                    <li><strong className="text-neutral-300">Highlights:</strong> Hover over a residue to point it out to others.</li>
                                </ul>
                            </div>

                            {/* Interaction */}
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-purple-500/20 text-purple-400 rounded-full text-[10px]">3</span>
                                    Interaction & Control
                                </h5>
                                <div className="ml-6 grid grid-cols-2 gap-3">
                                    <div>
                                        <strong className="text-white text-[11px] block">Pass the Chalk</strong>
                                        <p className="text-[10px] text-neutral-500">
                                            The Host controls the view by default. Click a user's Nametag in the sidebar to give them control.
                                        </p>
                                    </div>
                                    <div>
                                        <strong className="text-white text-[11px] block">Live Chat</strong>
                                        <p className="text-[10px] text-neutral-500">
                                            Discuss findings in real-time with the built-in text chat and always-on nametags.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <strong className="text-green-400 text-xs block mb-1">Pro Tip: Instant Chat</strong>
                        <p className="text-[11px] text-neutral-400">
                            During a session, press <kbd className="bg-neutral-800 px-1 rounded text-neutral-300">C</kbd> to toggle the chat window without leaving your view.
                        </p>
                    </div>
                </div >
            )
        },
        {
            id: 'data',
            title: 'History & Favorites',
            icon: BookOpen,
            description: 'Manage your saved structures.',
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700/50">
                            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                <span className="text-yellow-500">★</span> Favorites
                            </h4>
                            <p className="text-[11px] text-neutral-400">
                                Click the star icon next to any structure name to save it to your local favorites for quick access.
                            </p>
                        </div>
                        <div className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700/50">
                            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                <span className="text-blue-400">🕒</span> History
                            </h4>
                            <p className="text-[11px] text-neutral-400">
                                Usually revisit structures? We automatically keep track of your last 10 viewed items in the History tab.
                            </p>
                        </div>
                    </div>
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-2">Built-in Library</h4>
                        <p className="text-xs text-neutral-400 mb-3">
                            Explore our curated collection of over 1000+ protein structures and small molecule chemicals.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-neutral-700 rounded text-[10px] text-neutral-300">Essential Enzymes</span>
                            <span className="px-2 py-1 bg-neutral-700 rounded text-[10px] text-neutral-300">Viral Proteins</span>
                            <span className="px-2 py-1 bg-neutral-700 rounded text-[10px] text-neutral-300">Drug Targets</span>
                            <span className="px-2 py-1 bg-blue-900/30 text-blue-200 border border-blue-500/20 rounded text-[10px]">Vitamins</span>
                            <span className="px-2 py-1 bg-blue-900/30 text-blue-200 border border-blue-500/20 rounded text-[10px]">Antibiotics</span>
                            <span className="px-2 py-1 bg-blue-900/30 text-blue-200 border border-blue-500/20 rounded text-[10px]">Nucleotides</span>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <strong className="text-yellow-400 text-xs block mb-1">Pro Tip: Data Persistence</strong>
                        <p className="text-[11px] text-neutral-400">
                            Your **History** and **Favorites** are stored locally in your browser, so they'll be here when you come back.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'visuals',
            title: 'Visualization',
            icon: Sparkles,
            description: 'Representations, Coloring, and Lighting.',
            content: (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4 rounded-xl">
                            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-400" /> Scientific Palettes
                            </h4>
                            <p className="text-xs text-neutral-300 mb-3">
                                Switch between <span className="text-white">Viridis, Magma, Cividis</span>, and Standard palettes. These are color-blind friendly and perceptually uniform.
                            </p>
                        </div>

                        <div className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700/50">
                            <h5 className="text-xs font-bold text-white mb-2">Representations</h5>
                            <ul className="text-xs space-y-1.5 text-neutral-400">
                                <li><strong className="text-neutral-300">Cartoon:</strong> Best for secondary structure.</li>
                                <li><strong className="text-neutral-300">Surface:</strong> visualizing pockets/volume.</li>
                                <li><strong className="text-neutral-300">Ball & Stick:</strong> Atomics & Bond Orders.</li>
                                <li><strong className="text-neutral-300">Licorice:</strong> Ligand interactions.</li>
                                <li><strong className="text-neutral-300">Base:</strong> DNA/RNA Nucleotides.</li>
                            </ul>
                        </div>

                        <div className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700/50">
                            <h5 className="text-xs font-bold text-white mb-2">Smart Coloring</h5>
                            <ul className="text-xs space-y-1.5 text-neutral-400">
                                <li><strong className="text-neutral-300">Hydrophobicity:</strong> Residue polarity.</li>
                                <li><strong className="text-neutral-300">B-Factor:</strong> Flexibility/Confidence.</li>
                                <li><strong className="text-neutral-300">Chain ID:</strong> Distinct chain colors.</li>
                                <li><strong className="text-neutral-300">Element:</strong> CPK standard.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <strong className="text-purple-400 text-xs block mb-1">Pro Tip: Performance</strong>
                        <p className="text-[11px] text-neutral-400">
                            Working with large complexes? Use **Cartoon** representation to maintain smooth frame rates while rotating.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'coloring',
            title: 'Custom Coloring',
            icon: Palette,
            description: 'Highlight specific residues and chains.',
            content: (
                <div className="space-y-6">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-pink-400" /> Custom Selection
                        </h4>
                        <p className="text-xs text-neutral-300 mb-4">
                            Create custom color schemes to highlight specific regions of interest.
                        </p>
                        <ul className="space-y-3 text-xs text-neutral-300">
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono">01</span>
                                <span>
                                    <strong className="text-white block">Select Chain</strong>
                                    Choose which chain to apply the coloring to (e.g., Chain A).
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono">02</span>
                                <span>
                                    <strong className="text-white block">Define Range</strong>
                                    Enter residue numbers (e.g., <code className="bg-neutral-800 px-1 rounded">10-50</code>) or comma-separated lists.
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-neutral-500 font-mono">03</span>
                                <span>
                                    <strong className="text-white block">Apply Color</strong>
                                    Pick a distinct color to make your selection stand out against the rest of the structure.
                                </span>
                            </li>
                        </ul>
                    </div>
                    <div className="mt-4 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                        <strong className="text-pink-400 text-xs block mb-1">Pro Tip: Syntax</strong>
                        <p className="text-[11px] text-neutral-400">
                            You can paste comma-separated lists (e.g., <code className="bg-neutral-800 px-1 rounded">10,15,42</code>) or ranges (<code className="bg-neutral-800 px-1 rounded">20-50</code>) directly.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'transparency',
            title: 'Transparency',
            icon: Ghost,
            description: 'See *through* the structure.',
            content: (
                <div className="space-y-6">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Ghost className="w-4 h-4 text-neutral-400" /> Transparency Layers
                        </h4>
                        <p className="text-xs text-neutral-300 mb-4">
                            Reveal internal cavities or focus on specific binding sites by making outer layers transparent.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-1">Per-Chain Mode</h5>
                                <p className="text-[11px] text-neutral-400">
                                    Adjust the opacity of an entire chain (e.g., Chain A) to ghost it out while keeping others solid.
                                </p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-1">Residue Mode</h5>
                                <p className="text-[11px] text-neutral-400">
                                    Create a "window" into the protein by making specific residues (e.g., <code className="bg-white/10 px-1 rounded">50-100</code>) transparent.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <strong className="text-blue-400 text-xs block mb-1">Pro Tip: Layering</strong>
                            <p className="text-[11px] text-neutral-400">
                                Combine <span className="text-white">Surface</span> representation with <span className="text-white">50% Opacity</span> to see the internal backbone structure through the volume.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'advanced-styles',
            title: 'Advanced Styles',
            icon: Shapes,
            description: 'Mix & Match representations.',
            content: (
                <div className="space-y-6">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Shapes className="w-4 h-4 text-purple-400" /> Advanced Styling
                        </h4>
                        <p className="text-xs text-neutral-300 mb-4">
                            Go beyond global settings. Apply different geometric representations to specific parts of the structure to tell a clearer story.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-purple-500/20 text-purple-400 rounded text-[10px]">1</span>
                                    Per-Chain Styles
                                </h5>
                                <p className="text-[11px] text-neutral-400 ml-6">
                                    Set a unique style for an entire chain.
                                    <br />
                                    <em className="text-neutral-500">Example: Render Chain A as <strong className="text-neutral-300">Surface</strong> (to show volume) and Chain B as <strong className="text-neutral-300">Licorice</strong> (to show bonds).</em>
                                </p>
                            </div>

                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <h5 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-4 h-4 flex items-center justify-center bg-pink-500/20 text-pink-400 rounded text-[10px]">2</span>
                                    Residue Styles
                                </h5>
                                <p className="text-[11px] text-neutral-400 ml-6">
                                    Highlight specific active sites or motifs with a different representation.
                                    <br />
                                    <em className="text-neutral-500">Example: Select residues <code className="bg-white/10 px-1 rounded">50-60</code> and set them to <strong className="text-neutral-300">Ball & Stick</strong> to make them pop out from the cartoon.</em>
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <div className="flex gap-2">
                                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                                <div>
                                    <strong className="text-purple-400 text-xs block mb-0.5">Priority Layering</strong>
                                    <p className="text-[10px] text-neutral-400">
                                        Residue styles override Chain styles, which override Global styles. Use this hierarchy to build complex scenes.
                                    </p>
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
            icon: Wrench,
            description: 'Advanced structural analysis tools.',
            content: (
                <div className="space-y-6">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3">Structural Tools</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Sequence Track</strong>
                                <p className="text-[11px] text-neutral-400">
                                    Analyze chain sequences. Color by <span className="text-yellow-400">Hydrophobicity</span> or <span className="text-purple-400">B-Factor</span> to identify key regions.
                                </p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Measurements Panel</strong>
                                <p className="text-[11px] text-neutral-400">
                                    Calculate distances (Å) between atoms. Manage list, customize colors, and <strong className="text-neutral-300">Export CSV</strong>.
                                </p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Structure Superposition</strong>
                                <p className="text-[11px] text-neutral-400">
                                    Align multiple protein structures (by PDB ID or file) onto the main view to compare conformations.
                                </p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                <strong className="text-white text-xs block mb-1">Contact Map</strong>
                                <p className="text-[11px] text-neutral-400">
                                    Interactive 2D heatmap of residue interactions. Click cells to visualize contacts in 3D.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-neutral-500/10 border border-neutral-500/20 rounded-lg">
                        <strong className="text-neutral-400 text-xs block mb-1">Pro Tip: Export Data</strong>
                        <p className="text-[11px] text-neutral-400">
                            The **Measurements Panel** allows you to export your distance calculations as a CSV file for analysis in Excel.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'settings',
            title: 'Personalization',
            icon: Activity, // Using Activity icon as placeholder for settings-like thing if Settings icon isn't imported, but imports show Activity is used for Analysis. Let's check imports.
            description: 'Accessibility and appearance settings.',
            content: (
                <div className="space-y-4">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3">Accessibility</h4>
                        <div className="flex items-start gap-3">
                            <div className="bg-black/20 p-2 rounded border border-white/5 shrink-0">
                                <span className="text-lg">Aa</span>
                            </div>
                            <div>
                                <strong className="text-white text-xs block mb-1">OpenDyslexic Font</strong>
                                <p className="text-[11px] text-neutral-400">
                                    Toggle the specialized font designed to mitigate some of the common reading errors caused by dyslexia.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3">Appearance</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <strong className="text-white text-xs block mb-1">Background Color</strong>
                                <p className="text-[11px] text-neutral-400">
                                    Custom color picker for the viewer background. Try dark blue for presentations!
                                </p>
                            </div>
                            <div>
                                <strong className="text-white text-xs block mb-1">Clean Mode</strong>
                                <p className="text-[11px] text-neutral-400">
                                    Hides all UI elements for distraction-free viewing or clean screenshots.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                        <strong className="text-white text-xs block mb-1">Pro Tip: Screenshots</strong>
                        <p className="text-[11px] text-neutral-400">
                            Combine **Clean Mode** with a custom background color to create publication-ready figure bases.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'export',
            title: 'Export & Share',
            icon: Share2,
            description: 'Saving images, movies, and sessions.',
            content: (
                <div className="space-y-4">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3">Publication Ready Exports</h4>
                        <div className="grid grid-cols-3 gap-3 text-xs text-center">
                            <div className="bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors">
                                <div className="text-2xl mb-1">📸</div>
                                <div className="text-bold text-white">Image</div>
                                <div className="text-neutral-500 scale-90">High-Res PNG (3x)</div>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors">
                                <div className="text-2xl mb-1">🎬</div>
                                <div className="font-bold text-white">Movie</div>
                                <div className="text-neutral-500 scale-90">Studio Mode</div>
                            </div>
                            <div className="bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors">
                                <div className="text-2xl mb-1">💾</div>
                                <div className="font-bold text-white">Session</div>
                                <div className="text-neutral-500 scale-90">Save JSON State</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 p-4 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <Video className="w-4 h-4 text-pink-400" /> Studio Mode
                        </h4>
                        <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
                            Create professional molecular animations directly in the browser.
                        </p>
                        <ul className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Keyframe Animation
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Camera Movements
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Transition Effects
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> HD Video Export
                            </li>
                        </ul>
                    </div>
                    <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <strong className="text-rose-400 text-xs block mb-1">Pro Tip: Transparent PNGs</strong>
                        <p className="text-[11px] text-neutral-400">
                            Image exports automatically include an alpha channel (transparent background) if you haven't set a custom background color.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'shortcuts',
            title: 'Shortcuts',
            icon: Keyboard,
            description: 'Keyboard cheat sheet.',
            content: (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="col-span-2 pb-1 mb-1 border-b border-neutral-800 font-bold text-neutral-400 uppercase tracking-widest text-[10px]">General</div>
                    <div className="flex justify-between text-neutral-300"><span>Help Guide</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">?</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Command Palette</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">⌘K</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Full Screen</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">F</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Theme Toggle</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">T</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Screenshot</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">S</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Undo</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">⌘Z / Ctrl+Z</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Redo</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">⇧⌘Z / Shift+Ctrl+Z</kbd></div>

                    <div className="col-span-2 pb-1 mb-1 mt-3 border-b border-neutral-800 font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Views</div>
                    <div className="flex justify-between text-neutral-300"><span>Reset View</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">R</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Toggle Spin</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">Space</kbd></div>
                    <div className="flex justify-between text-neutral-300"><span>Measurement</span> <kbd className="font-mono bg-neutral-800 px-1.5 rounded text-neutral-400">M</kbd></div>
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
            description: 'Get in touch with the developer.',
            content: (
                <div className="space-y-6">
                    <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                        <h4 className="text-sm font-bold text-white mb-3">We'd love to hear from you!</h4>
                        <p className="text-xs text-neutral-300 mb-6">
                            Have a suggestion, found a bug, or just want to say hi? Reach out through any of the channels below.
                        </p>

                        <div className="space-y-3">
                            {/* Email Option */}
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
                                        Reach out directly for questions
                                    </p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-neutral-600 group-hover:text-blue-400 transition-colors" />
                            </a>

                            {/* GitHub Option */}
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

                            {/* LinkedIn Option */}
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

                            <a
                                href="https://buymeacoffee.com/amirmcheraghali"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black text-xs font-bold rounded-lg shadow-lg shadow-yellow-900/10 transition-all hover:scale-105"
                            >
                                <Heart className="w-3.5 h-3.5 fill-black/20" />
                                Buy Me a Coffee
                            </a>
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
            <div className={`fixed z-40 group transition-all duration-300 ease-in-out ${isMolStarActive ? (isMolStarSidebarExpanded ? 'bottom-20 right-[380px]' : 'bottom-20 right-[80px]') : `top-4 ${hasSequence ? 'right-[80px] md:right-[176px]' : 'right-[80px]'}`}`}>
                <button
                    className={`h-10 px-4 rounded-full border shadow-lg backdrop-blur-md transition-all group-hover:bg-neutral-800 group-hover:text-white flex items-center gap-2 ${isLightMode ? 'bg-white/80 text-pink-600 border-black/10' : 'bg-neutral-900/80 text-pink-500 border-white/10'}`}
                >
                    <Heart className={`w-4 h-4 ${isLightMode ? 'fill-pink-100' : 'fill-pink-900/30'}`} />
                    <span className="text-xs font-bold hidden sm:block">Donate</span>
                </button>

                {/* Dropdown Menu - Upward or Downward depending on position */}
                <div className={`absolute right-0 w-48 py-2 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform flex flex-col overflow-hidden ${isMolStarActive ? 'bottom-12 translate-y-[10px] group-hover:translate-y-0' : 'top-12 translate-y-[-10px] group-hover:translate-y-0'}`}>
                    {/* Buy Me A Coffee */}
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
                            <span className="text-xs font-bold text-white">Buy Me a Coffee</span>
                            <span className="text-[10px] text-neutral-400">Support widely</span>
                        </div>
                    </a>
                </div>
            </div>

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed z-40 h-10 w-10 flex items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 ease-in-out hover:scale-105 group ${isMolStarActive ? (isMolStarSidebarExpanded ? 'bottom-20 right-[330px]' : 'bottom-20 right-[30px]') : `top-4 ${hasSequence ? 'right-[27px] md:right-[123px]' : 'right-[27px]'}`} ${isLightMode ? 'bg-white/80 text-neutral-600 hover:text-blue-600 border-black/10 hover:bg-white' : 'bg-neutral-900/80 text-neutral-400 hover:text-white border-white/10'}`}
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
                                <div className="p-5 border-b border-neutral-800">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <CircleHelp className="w-5 h-5 text-blue-500" />
                                        User Manual
                                    </h2>
                                    <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Quercus Viewer v1.0</p>
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
