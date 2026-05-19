import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Play, Terminal, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../lib/i18n';

/**
 * Tiptap Extension for Jupyter-style Code Cells
 */
export const CodeCell = Node.create({
  name: 'codeCell',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      code: {
        default: '# Type your Python code here\nprint("Hello, Scientist!")',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-code') || '',
        renderHTML: (attributes: Record<string, any>) => ({ 'data-code': attributes.code }),
      },
      output: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-output') || '',
        renderHTML: (attributes: Record<string, any>) => ({ 'data-output': attributes.output }),
      },
      lastRun: {
        default: null,
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="code-cell"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'code-cell' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeCellComponent);
  },

  addStorage() {
    return {
      markdown: {
        serialize: (state: any, node: any) => {
          const payload = JSON.stringify({
            code: node.attrs.code,
            output: node.attrs.output
          });
          const base64 = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(payload))) : Buffer.from(payload).toString('base64');
          state.write(`\n\`\`\`python-kernel\n${base64}\n\`\`\`\n`);
          state.closeBlock(node);
        },
        parse: {
          setup: (markdownit: any) => {
            markdownit.use((md: any) => {
              const defaultRender = md.renderer.rules.fence || function(tokens: any, idx: any, options: any, _env: any, self: any) {
                return self.renderToken(tokens, idx, options);
              };

              md.renderer.rules.fence = (tokens: any, idx: any, options: any, _env: any, self: any) => {
                const token = tokens[idx];
                if (token.info === 'python-kernel') {
                  try {
                    const base64 = token.content.trim();
                    const jsonStr = typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(base64))) : Buffer.from(base64, 'base64').toString('utf8');
                    const attrs = JSON.parse(jsonStr);
                    const escapeHtml = (str: string) => String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                    
                    return `<div data-type="code-cell" data-code="${escapeHtml(attrs.code || '')}" data-output="${escapeHtml(attrs.output || '')}"></div>`;
                  } catch (e) {
                    console.error('Failed to parse code-cell:', e);
                  }
                }
                return defaultRender(tokens, idx, options, _env, self);
              };
            });
          }
        }
      }
    }
  }
});

// --- Pyodide Global Loader ---
let pyodideInstance: any = null;
let pyodidePromise: Promise<any> | null = null;

async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    // Check if script already exists
    if (!document.getElementById('pyodide-script')) {
      const script = document.createElement('script');
      script.id = 'pyodide-script';
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      document.head.appendChild(script);

      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

    // @ts-ignore
    pyodideInstance = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });
    return pyodideInstance;
  })();

  return pyodidePromise;
}

// --- Component ---
const CodeCellComponent = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const { t } = useTranslation();
  const { code, output } = node.attrs;
  const [localCode, setLocalCode] = useState(code);
  const [localOutput, setLocalOutput] = useState(output);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!!pyodideInstance);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    setLocalOutput(t.ccRunning as string);

    try {
      const py = await getPyodide();
      setIsLoaded(true);

      // Redirect stdout
      py.runPython(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
      `);

      try {
        await py.runPythonAsync(localCode);
        const stdout = py.runPython("sys.stdout.getvalue()");
        const stderr = py.runPython("sys.stderr.getvalue()");
        
        const finalOutput = (stdout + stderr).trim() || (t.ccExecFinished as string);
        setLocalOutput(finalOutput);
        updateAttributes({ code: localCode, output: finalOutput, lastRun: new Date().toISOString() });
      } catch (e: any) {
        setLocalOutput(e.message);
        setError(e.message);
        updateAttributes({ code: localCode, output: e.message });
      }
    } catch (err: any) {
      setError(t.ccFailedLoad as string);
      setLocalOutput(t.ccErrorLoad as string);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <NodeViewWrapper className="code-cell-wrapper my-8 group relative select-none">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl transition-all group-hover:border-blue-500/50">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg shadow-inner">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              {t.ccPythonKernel}
              {isLoaded && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={runCode} 
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                isRunning 
                  ? 'bg-blue-500/10 text-blue-400 cursor-wait' 
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-95'
              }`}
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
              {isRunning ? t.ccRunning : t.ccRunCell}
            </button>
            <button onClick={deleteNode} className="p-1.5 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 rounded-lg transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Code Editor Area */}
        <div className="relative">
          <textarea
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value)}
            onBlur={() => updateAttributes({ code: localCode })}
            className="w-full min-h-[100px] p-6 bg-transparent text-[#e6edf3] font-mono text-sm leading-relaxed focus:outline-none resize-y selection:bg-blue-500/30"
            spellCheck={false}
          />
        </div>

        {/* Output Area */}
        {localOutput && (
          <div className="border-t border-[#30363d] bg-black/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${error ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {t.ccOutput}
              </div>
            </div>
            <pre className={`text-[13px] font-mono whitespace-pre-wrap leading-relaxed ${error ? 'text-red-400/90' : 'text-neutral-400'}`}>
              {localOutput}
            </pre>
          </div>
        )}

        {/* Loading/Error State Footer */}
        {!isLoaded && !isRunning && (
          <div className="px-4 py-2 bg-amber-500/5 flex items-center gap-2 border-t border-amber-500/10">
            <AlertCircle className="w-3 h-3 text-amber-500/50" />
            <span className="text-[10px] text-amber-500/70">{t.ccKernelNotInit}</span>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
