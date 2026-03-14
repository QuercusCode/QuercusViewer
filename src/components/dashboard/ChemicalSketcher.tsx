import { useState, useEffect, useRef } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Beaker, Edit2, Trash2, X, Plus } from 'lucide-react';

// --- Tiptap Extension ---

export const ChemicalSketcher = Node.create({
  name: 'chemicalSketcher',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      molfile: {
        default: '',
        parseHTML: element => element.getAttribute('data-molfile') || '',
        renderHTML: attributes => ({
          'data-molfile': attributes.molfile,
        }),
      },
      svg: {
        default: '',
        parseHTML: element => element.getAttribute('data-svg') || '',
        renderHTML: attributes => ({
          'data-svg': attributes.svg,
        }),
      },
      width: {
        default: '100%',
        parseHTML: element => element.getAttribute('data-width') || '100%',
        renderHTML: attributes => ({
          'data-width': attributes.width,
        }),
      },
      height: {
        default: '300px',
        parseHTML: element => element.getAttribute('data-height') || '300px',
        renderHTML: attributes => ({
          'data-height': attributes.height,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="chemical-sketcher"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chemical-sketcher' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChemicalSketcherComponent);
  },
});

// --- Component & Modal ---

const JS_CDN = "https://jsme-editor.github.io/dist/jsme/jsme.nocache.js";

// Global script loader tracker
let scriptLoadingStarted = false;

const ChemicalSketcherComponent = ({ node, updateAttributes, deleteNode }: any) => {
  const { molfile, svg, width, height } = node.attrs;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jsmeReady, setJsmeReady] = useState(false);
  const jsmeAppletRef = useRef<any>(null);
  const [containerId] = useState(() => `jsme_editor_ct_${Math.random().toString(36).substring(2, 9)}`);
  const [initError, setInitError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string>("");

  // Resizing state
  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const nextWidth = e.clientX - rect.left;
      const nextHeight = e.clientY - rect.top;

      // Min constraints
      const finalWidth = Math.max(300, nextWidth);
      const finalHeight = Math.max(150, nextHeight);

      // Using styles for smooth visual feedback
      previewRef.current.style.width = `${finalWidth}px`;
      previewRef.current.style.height = `${finalHeight}px`;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (previewRef.current) {
        updateAttributes({
          width: previewRef.current.style.width,
          height: previewRef.current.style.height
        });
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateAttributes]);

  // 1. Script Loading Logic
  useEffect(() => {
    if (!isModalOpen) return;

    const checkLibrary = () => (window as any).JSApplet?.JSME || (window as any).JSMe || (window as any).JSME || (window as any).jsme;

    if (checkLibrary()) {
      setJsmeReady(true);
      return;
    }

    if (!scriptLoadingStarted) {
      scriptLoadingStarted = true;
      
      // JSME requires this global callback
      (window as any).jsmeOnLoad = () => {
        setJsmeReady(true);
      };

      const script = document.createElement('script');
      script.id = 'jsme-script-v5';
      script.src = JS_CDN;
      script.async = true;
      document.body.appendChild(script);
    }

    // Fallback polling in case callback fails
    const interval = setInterval(() => {
      if (checkLibrary()) {
        setJsmeReady(true);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isModalOpen]);

  // 2. Initializer function (Internal)
  const initSketcherInternal = () => {
    if (!isModalOpen || !jsmeReady) return;
    
    setInitError(null);
    const w = window as any;
    // According to official docs, it's JSApplet.JSME
    const Constructor = w.JSApplet?.JSME || w.JSMe || w.JSME || w.jsme;
    
    // Update diagnostics
    setDiagnostics(`JSApplet: ${!!w.JSApplet}, JSApplet.JSME: ${!!w.JSApplet?.JSME}, JSMe: ${!!w.JSMe}, JSME: ${!!w.JSME}`);

    if (!Constructor) {
      setInitError("Scientific library not available yet.");
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      setTimeout(initSketcherInternal, 50);
      return;
    }

    try {
      // CLEAR the container first to avoid GWT "already attached" errors
      container.innerHTML = "";
      jsmeAppletRef.current = null;
      
      // Initialize fresh instance
      jsmeAppletRef.current = new Constructor(
        containerId, 
        "100%", "450px", {
          "options": "query,perspective,zoom,hydrogens"
        }
      );
      
      if (molfile) {
        setTimeout(() => {
          if (jsmeAppletRef.current && molfile) {
            jsmeAppletRef.current.readMolFile(molfile);
          }
        }, 150);
      }
    } catch (err: any) {
      console.error("V5 Sketcher Error:", err);
      setInitError(`Engine Error: ${err.message || 'Unknown'}`);
    }
  };

  // 3. Lifecycle Trigger
  useEffect(() => {
    if (isModalOpen && jsmeReady) {
      const handle = requestAnimationFrame(() => {
        const timeout = setTimeout(initSketcherInternal, 500);
        return () => clearTimeout(timeout);
      });
      return () => {
        cancelAnimationFrame(handle);
        jsmeAppletRef.current = null;
      };
    }
  }, [isModalOpen, jsmeReady, containerId]);

  const handleSave = () => {
    const applet = jsmeAppletRef.current;
    if (!applet) return;

    try {
      // retrieval methods based on official JSME research
      const newMolfile = applet.molFile ? applet.molFile() : "";
      
      // getMolecularAreaGraphicsString() is the official SVG getter
      const newSvg = applet.getMolecularAreaGraphicsString 
        ? applet.getMolecularAreaGraphicsString() 
        : "";

      if (newMolfile) {
        updateAttributes({ 
          molfile: newMolfile,
          svg: newSvg
        });
        setIsModalOpen(false);
        setDiagnostics(""); // Clear on success
        jsmeAppletRef.current = null;
      } else {
        setInitError("Please draw a structure before saving.");
      }
    } catch (e: any) {
      console.error("Sketcher Save Error:", e);
      setInitError(`Save failed: ${e.message || 'Unknown API error'}`);
    }
  };

  return (
    <NodeViewWrapper className="chemical-sketcher-wrapper my-6 group relative">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-lg p-6 transition-all group-hover:border-indigo-500/30">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Beaker className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">2D Molecular Structure</h3>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Chemical Sketcher</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Edit Structure"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => deleteNode()}
              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Delete Structure"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div 
          ref={previewRef}
          onClick={() => !molfile && setIsModalOpen(true)}
          style={{ width: width || '100%', height: height || '300px' }}
          className={`relative flex items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            molfile 
              ? 'bg-white/5 border-transparent' 
              : 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/40'
          } ${isResizing ? 'border-indigo-500 ring-4 ring-indigo-500/10' : ''}`}
        >
          {molfile ? (
            <div className="w-full h-full flex items-center justify-center p-4 invert dark:invert-0 opacity-90 transition-transform duration-300" 
                 dangerouslySetInnerHTML={{ __html: svg }} 
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-indigo-400/60">
              <Plus className="w-8 h-8 opacity-40" />
              <span className="text-xs font-bold uppercase tracking-widest">Sketch Molecule</span>
            </div>
          )}

          {/* Resize Handle */}
          <div 
            ref={resizerRef}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsResizing(true);
            }}
            className="absolute bottom-1 right-1 w-6 h-6 flex items-end justify-end p-1 cursor-nwse-resize group/resizer"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--border-main)] group-hover/resizer:bg-indigo-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Sketcher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[var(--bg-main)] border border-[var(--border-main)] w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-sidebar)]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                  <Beaker className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Molecular Sketcher</h2>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Draw your 2D structure below</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-all cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Editor Body */}
            <div className="flex-1 p-8 bg-[var(--bg-main)]">
              {!jsmeReady || initError ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-[var(--text-muted)]">
                  {initError ? (
                    <>
                      <div className="p-3 bg-red-500/10 text-red-400 rounded-full mb-4">
                        <X className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)] mb-2">Initialization Failed</p>
                      <p className="text-xs text-[var(--text-muted)] mb-2 text-center max-w-[240px] leading-relaxed">
                        {initError}
                      </p>
                      <p className="text-[10px] text-gray-500 mb-6 font-mono bg-black/20 p-2 rounded-lg">
                        {diagnostics}
                      </p>
                      <button 
                        onClick={initSketcherInternal}
                        className="px-6 py-2 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--border-main)] text-[var(--text-primary)] text-xs font-bold transition-all"
                      >
                        Try Again
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-sm font-medium">Initializing JSME Sketcher...</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border-main)] overflow-hidden shadow-inner bg-white">
                  <div id={containerId} style={{ minHeight: '450px', width: '100%' }}></div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-sidebar)]">
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">
                Powered by JSME Editor
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-[var(--border-main)] text-[var(--text-primary)] text-sm font-bold hover:bg-[var(--input-bg)] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!jsmeReady || !!initError}
                  className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Save to Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};
