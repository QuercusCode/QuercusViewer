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

const ChemicalSketcherComponent = ({ node, updateAttributes, deleteNode }: any) => {
  const { molfile, svg } = node.attrs;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jsmeReady, setJsmeReady] = useState(false);
  const jsmeAppletRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const JS_CDN = "https://jsme-editor.github.io/dist/jsme/jsme.nocache.js";

  // Load JSME library
  useEffect(() => {
    if (isModalOpen && !window.hasOwnProperty('jsmeOnLoad')) {
      const script = document.createElement('script');
      script.src = JS_CDN;
      script.async = true;
      document.body.appendChild(script);

      // JSME requires this global callback
      (window as any).jsmeOnLoad = () => {
        setJsmeReady(true);
      };
    } else if (isModalOpen && (window as any).JSME) {
       setJsmeReady(true);
    }
  }, [isModalOpen]);

  // Initialize JSME Applet when modal opens and script is ready
  useEffect(() => {
    if (isModalOpen && jsmeReady && containerRef.current) {
      const jsmeContainerId = "jsme_container";
      
      setTimeout(() => {
        if (!jsmeAppletRef.current && (window as any).JSME) {
          jsmeAppletRef.current = new (window as any).JSME.JSME(
            jsmeContainerId, 
            "100%", "400px", {
              "options": "query,perspective"
            }
          );
          
          if (molfile) {
            jsmeAppletRef.current.readMolFile(molfile);
          }
        }
      }, 100);
    }
  }, [isModalOpen, jsmeReady, molfile]);

  const handleSave = () => {
    if (jsmeAppletRef.current) {
      const newMolfile = jsmeAppletRef.current.molFile();
      // JSME asSVG() returns the SVG source code
      const newSvg = jsmeAppletRef.current.asSVG();

      updateAttributes({ 
        molfile: newMolfile,
        svg: newSvg
      });
      setIsModalOpen(false);
      jsmeAppletRef.current = null;
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
          onClick={() => !molfile && setIsModalOpen(true)}
          className={`flex items-center justify-center min-h-[200px] rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            molfile 
              ? 'bg-white/5 border-transparent' 
              : 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/40'
          }`}
        >
          {molfile ? (
            <div className="max-w-full overflow-hidden p-4 invert dark:invert-0 opacity-90 scale-125 transform-gpu" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-indigo-400/60">
              <Plus className="w-8 h-8 opacity-40" />
              <span className="text-xs font-bold uppercase tracking-widest">Sketch Molecule</span>
            </div>
          )}
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
              {!jsmeReady ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-[var(--text-muted)]">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-medium">Initializing JSME Sketcher...</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border-main)] overflow-hidden shadow-inner bg-white">
                  <div id="jsme_container" ref={containerRef}></div>
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
                  disabled={!jsmeReady}
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
