import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import { BookOpen, ExternalLink, Trash2, Loader2, RotateCcw, Search } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CitationData {
    title: string;
    authors: string;   // e.g. "Smith J, Doe A, et al."
    journal: string;
    year: string;
    volume: string;
    issue: string;
    pages: string;
    doi: string;
    pmid: string;
    url: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function isPMID(input: string): boolean {
    return /^\d{1,8}$/.test(input.trim());
}

function isDOI(input: string): boolean {
    return input.trim().startsWith('10.');
}

async function fetchByPMID(pmid: string): Promise<CitationData> {
    const res = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid.trim()}&retmode=json`
    );
    if (!res.ok) throw new Error('PubMed request failed');
    const data = await res.json();
    const result = data.result?.[pmid.trim()];
    if (!result || result.error) throw new Error('PMID not found');

    const authors = (result.authors as any[])
        ?.slice(0, 3)
        .map((a: any) => a.name)
        .join(', ') + (result.authors?.length > 3 ? ', et al.' : '') || '';

    const doi = result.elocationid?.replace('doi: ', '') || '';

    return {
        title: result.title?.replace(/\.$/, '') || '',
        authors,
        journal: result.fulljournalname || result.source || '',
        year: result.pubdate?.split(' ')?.[0] || '',
        volume: result.volume || '',
        issue: result.issue || '',
        pages: result.pages || '',
        doi,
        pmid: pmid.trim(),
        url: doi
            ? `https://doi.org/${doi}`
            : `https://pubmed.ncbi.nlm.nih.gov/${pmid.trim()}/`,
    };
}

async function fetchByDOI(doi: string): Promise<CitationData> {
    const clean = doi.trim().replace(/^https?:\/\/doi\.org\//i, '');
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(clean)}`);
    if (!res.ok) throw new Error('DOI not found');
    const data = await res.json();
    const msg = data.message;

    const authorsList = (msg.author as any[] | undefined)
        ?.slice(0, 3)
        .map((a: any) => `${a.family ?? ''} ${(a.given ?? '').charAt(0)}${a.given ? '.' : ''}`.trim())
        .join(', ') + ((msg.author?.length ?? 0) > 3 ? ', et al.' : '') || '';

    const year = String(
        msg.published?.['date-parts']?.[0]?.[0] ??
        msg['published-print']?.['date-parts']?.[0]?.[0] ??
        msg['published-online']?.['date-parts']?.[0]?.[0] ??
        ''
    );

    return {
        title: (msg.title?.[0] ?? '').replace(/\.$/, ''),
        authors: authorsList,
        journal: msg['container-title']?.[0] ?? msg.publisher ?? '',
        year,
        volume: msg.volume ?? '',
        issue: msg.issue ?? '',
        pages: msg.page ?? '',
        doi: clean,
        pmid: '',
        url: `https://doi.org/${clean}`,
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

const CitationBlockComponent = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
    const citation: CitationData | null = node.attrs.citation;
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!citation) inputRef.current?.focus();
    }, [citation]);

    const resolve = async () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        setLoading(true);
        setError('');
        try {
            let data: CitationData;
            if (isPMID(trimmed)) {
                data = await fetchByPMID(trimmed);
            } else if (isDOI(trimmed)) {
                data = await fetchByDOI(trimmed);
            } else {
                // Try CrossRef anyway (handles full DOI URLs or bare DOIs with other prefixes)
                data = await fetchByDOI(trimmed);
            }
            updateAttributes({ citation: data });
            setInput('');
        } catch (e: any) {
            setError('Could not find this DOI or PMID. Check the value and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); resolve(); }
    };

    const reset = () => updateAttributes({ citation: null });

    // ── Resolved state ────────────────────────────────────────────────────────
    if (citation) {
        const parts: string[] = [];
        if (citation.volume) parts.push(`${citation.volume}${citation.issue ? `(${citation.issue})` : ''}`);
        if (citation.pages) parts.push(citation.pages);

        return (
            <NodeViewWrapper as="div" className="my-4 group/cite">
                <div className="relative flex gap-3 p-3.5 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl hover:border-blue-500/30 transition-colors">
                    <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[var(--text-primary)] hover:text-blue-400 transition-colors leading-snug line-clamp-2 flex items-start gap-1 group/link"
                        >
                            <span>{citation.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                        {citation.authors && (
                            <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{citation.authors}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
                            {citation.journal && (
                                <span className="italic text-[var(--text-secondary)]">{citation.journal}</span>
                            )}
                            {citation.year && <span>{citation.year}</span>}
                            {parts.length > 0 && <span>{parts.join(': ')}</span>}
                            {citation.doi && (
                                <span className="font-mono opacity-60 truncate max-w-[200px]"
                                    title={`DOI: ${citation.doi}`}>
                                    DOI:{citation.doi}
                                </span>
                            )}
                            {citation.pmid && !citation.doi && (
                                <span className="font-mono opacity-60">PMID:{citation.pmid}</span>
                            )}
                        </div>
                    </div>
                    {/* Action buttons */}
                    <div className="shrink-0 flex gap-1 opacity-0 group-hover/cite:opacity-100 transition-opacity">
                        <button
                            onClick={reset}
                            className="p-1.5 rounded-lg hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            title="Edit citation"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => deleteNode()}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                            title="Remove citation"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </NodeViewWrapper>
        );
    }

    // ── Input state ───────────────────────────────────────────────────────────
    return (
        <NodeViewWrapper as="div" className="my-4">
            <div className="flex flex-col gap-2 p-4 bg-[var(--bg-sidebar)] border border-[var(--border-main)] border-dashed rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">Insert Citation</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Enter a <strong className="text-[var(--text-secondary)]">PubMed ID</strong> (e.g. <code className="bg-[var(--input-bg)] px-1 rounded">38261013</code>) or a{' '}
                    <strong className="text-[var(--text-secondary)]">DOI</strong> (e.g. <code className="bg-[var(--input-bg)] px-1 rounded">10.1038/s41586-021-03819-2</code>).
                </p>
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => { setInput(e.target.value); setError(''); }}
                        onKeyDown={handleKeyDown}
                        placeholder="PMID or DOI…"
                        className="flex-1 h-9 px-3 text-sm bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-colors"
                        spellCheck={false}
                    />
                    <button
                        onClick={resolve}
                        disabled={!input.trim() || loading}
                        className="h-9 px-4 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {loading
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Search className="w-3.5 h-3.5" />
                        }
                        {loading ? 'Looking up…' : 'Look up'}
                    </button>
                    <button
                        onClick={() => deleteNode()}
                        className="h-9 px-2.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
                {error && (
                    <p className="text-[11px] text-red-400">{error}</p>
                )}
            </div>
        </NodeViewWrapper>
    );
};

// ─── TipTap Extension ─────────────────────────────────────────────────────────

export const CitationBlock = Node.create({
    name: 'citationBlock',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            citation: {
                default: null,
                parseHTML: (el: HTMLElement) => {
                    try { return JSON.parse(el.getAttribute('data-citation') || 'null'); } catch { return null; }
                },
                renderHTML: (attrs: Record<string, any>) =>
                    attrs.citation ? { 'data-citation': JSON.stringify(attrs.citation) } : {},
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="citation-block"]' }];
    },

    renderHTML({ HTMLAttributes }: any) {
        return ['div', { 'data-type': 'citation-block', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(CitationBlockComponent);
    },
});
