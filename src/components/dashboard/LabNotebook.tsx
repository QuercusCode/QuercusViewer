import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { NotebookPen, Plus, Trash2, Save, FileText, Search, Code, Eye, Loader2 } from 'lucide-react';
import { listNotebooks, createNotebook, updateNotebook, deleteNotebook } from '../../lib/notebookService';
import type { NotebookEntry } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const LabNotebook: React.FC = () => {
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
    const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchNotebooks = async () => {
            try {
                setLoading(true);
                const data = await listNotebooks(user.id);
                setNotebooks(data);
                if (data.length > 0 && !activeId) {
                    setActiveId(data[0].id);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load notebooks');
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

    if (!user) return null;

    return (
        <div className="flex h-full w-full bg-neutral-950 overflow-hidden text-neutral-300">
            {/* Left Sidebar: List */}
            <div className="w-80 border-r border-neutral-800 bg-neutral-900/50 flex flex-col shrink-0">
                <div className="p-4 border-b border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <NotebookPen className="w-5 h-5 text-blue-400" />
                            Lab Notebook
                        </h2>
                        <button
                            onClick={handleCreate}
                            className="p-1.5 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg transition-colors cursor-pointer"
                            title="New Entry"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search entries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-neutral-950/50 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-neutral-700 transition-colors"
                        />
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{error}</div>}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-neutral-500">Loading notebooks...</div>
                    ) : filteredNotebooks.length === 0 ? (
                        <div className="p-4 text-center text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl m-2 bg-neutral-950/20">
                            No notebook entries found.
                        </div>
                    ) : (
                        filteredNotebooks.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => setActiveId(entry.id)}
                                className={`w-full text-left px-3 py-3 rounded-xl transition-all group relative border ${activeId === entry.id
                                    ? 'bg-blue-500/10 border-blue-500/30 text-white shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-neutral-800/50 hover:border-neutral-700/50 text-neutral-400'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-medium truncate pr-6 text-sm">
                                        {entry.title || 'Untitled Entry'}
                                    </h3>
                                    <button
                                        onClick={(e) => handleDelete(e, entry.id)}
                                        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all"
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

            {/* Right Pane: Editor Shell */}
            <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative">
                {activeNotebook ? (
                    <div className="flex-1 flex flex-col h-full w-full max-w-5xl mx-auto">
                        {/* Editor Toolbar */}
                        <div className="flex items-center justify-between px-8 py-4 border-b border-neutral-800/50 shrink-0">
                            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode('write')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'write' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    <Code className="w-4 h-4" /> Write
                                </button>
                                <button
                                    onClick={() => setViewMode('preview')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'preview' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    <Eye className="w-4 h-4" /> Preview
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                        <span>Saving...</span>
                                    </>
                                ) : lastSaved ? (
                                    <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => handleEditorChange('title', e.target.value)}
                                className="bg-transparent border-none text-4xl font-bold font-serif text-white focus:outline-none w-full mb-8 placeholder-neutral-700"
                                placeholder="Notebook Title..."
                            />

                            {viewMode === 'write' ? (
                                <textarea
                                    value={editContent}
                                    onChange={(e) => handleEditorChange('content', e.target.value)}
                                    placeholder="Start writing your lab notes here. Markdown is fully supported (e.g., # Headings, **bold**, *lists*)..."
                                    className="w-full h-full min-h-[500px] bg-transparent border-none focus:outline-none text-neutral-300 font-mono text-[15px] leading-relaxed resize-none placeholder-neutral-700"
                                />
                            ) : (
                                <div className="prose prose-invert prose-blue max-w-none prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {editContent || '*Nothing written yet.*'}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select or create a notebook entry to start writing.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
