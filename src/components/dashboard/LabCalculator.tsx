import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Calculator, Zap, Trash2, RefreshCcw, Info } from 'lucide-react';

// --- Tiptap Extension ---

export const LabCalculator = Node.create({
  name: 'labCalculator',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      type: {
        default: 'dilution', // 'dilution' | 'molarity'
        parseHTML: element => element.getAttribute('data-calc-type') || 'dilution',
        renderHTML: attributes => ({ 'data-calc-type': attributes.type }),
      },
      values: {
        default: {},
        parseHTML: element => {
          try {
            return JSON.parse(element.getAttribute('data-values') || '{}');
          } catch {
            return {};
          }
        },
        renderHTML: attributes => ({ 'data-values': JSON.stringify(attributes.values) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="lab-calculator"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'lab-calculator' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LabCalculatorComponent);
  },

  // Serialization for tiptap-markdown (PDF Export support)
  addStorage() {
    return {
      markdown: {
        serialize: (state: any, node: any) => {
          const payload = JSON.stringify({
            type: node.attrs.type,
            values: node.attrs.values
          });
          const base64 = btoa(unescape(encodeURIComponent(payload)));
          state.write(`[[calculator:${base64}]]`);
          state.closeBlock(node);
        },
      }
    }
  }
});

// --- Component ---

const LabCalculatorComponent = ({ node, updateAttributes, deleteNode }: any) => {
  const { type, values } = node.attrs;

  const handleUpdateValue = (key: string, val: string) => {
    const newValues = { ...values, [key]: val };
    
    // Auto-calculation logic
    const calc = performCalculation(type, newValues);
    updateAttributes({ values: calc });
  };

  const toggleType = () => {
    updateAttributes({ 
      type: type === 'dilution' ? 'molarity' : 'dilution',
      values: {} // Clear values on switch to avoid confusion
    });
  };

  const clear = () => updateAttributes({ values: {} });

  return (
    <NodeViewWrapper className="lab-calculator-wrapper my-8 group relative select-none">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-xl transition-all group-hover:border-blue-500/30">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-500/5 border-b border-[var(--border-main)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Calculator className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
              {type === 'dilution' ? 'Dilution (C1V1 = C2V2)' : 'Molarity (Mass = C × V × MW)'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleType}
              className="p-1.5 hover:bg-blue-500/10 text-[var(--text-muted)] hover:text-blue-400 rounded-lg transition-all"
              title="Switch Calculator Type"
            >
              <RefreshCcw className="w-3 h-3" />
            </button>
            <button 
              onClick={clear}
              className="p-1.5 hover:bg-amber-500/10 text-[var(--text-muted)] hover:text-amber-400 rounded-lg transition-all"
              title="Clear Values"
            >
              <Zap className="w-3 h-3" />
            </button>
            <button 
              onClick={deleteNode}
              className="p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 rounded-lg transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Form Grid */}
        <div className="p-5">
           <div className="grid grid-cols-2 gap-4">
              {type === 'dilution' ? (
                <>
                  <CalcField label="Initial Conc. (C1)" value={values.c1} onChange={(v: string) => handleUpdateValue('c1', v)} placeholder="e.g. 50" unit="mM" />
                  <CalcField label="Initial Vol. (V1)" value={values.v1} onChange={(v: string) => handleUpdateValue('v1', v)} placeholder="e.g. 10" unit="mL" />
                  <CalcField label="Final Conc. (C2)" value={values.c2} onChange={(v: string) => handleUpdateValue('c2', v)} placeholder="?" unit="mM" />
                  <CalcField label="Final Vol. (V2)" value={values.v2} onChange={(v: string) => handleUpdateValue('v2', v)} placeholder="?" unit="mL" />
                </>
              ) : (
                <>
                  <CalcField label="Desired Conc." value={values.c} onChange={(v: string) => handleUpdateValue('c', v)} placeholder="e.g. 100" unit="mM" />
                  <CalcField label="Target Vol." value={values.v} onChange={(v: string) => handleUpdateValue('v', v)} placeholder="e.g. 500" unit="mL" />
                  <CalcField label="Mol. Weight" value={values.mw} onChange={(v: string) => handleUpdateValue('mw', v)} placeholder="e.g. 180.16" unit="g/mol" />
                  <CalcField label="Required Mass" value={values.m} onChange={(v: string) => handleUpdateValue('m', v)} placeholder="?" unit="mg" />
                </>
              )}
           </div>

           {/* Info Footer */}
           <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
              <Info className="w-3 h-3 text-blue-400/50" />
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                Fill any 3 fields to calculate the 4th automatically. Units are relative.
              </p>
           </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// --- Sub-components & Helpers ---

const CalcField = ({ label, value, onChange, placeholder, unit }: any) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">{label}</label>
    <div className="relative flex items-center group/field">
      <input 
        type="text"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-4 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
      />
      <span className="absolute right-4 text-[10px] font-bold text-blue-400 opacity-50 group-focus-within/field:opacity-100 transition-opacity">
        {unit}
      </span>
    </div>
  </div>
);

function performCalculation(type: string, vals: Record<string, string>) {
  const v = { ...vals };
  
  if (type === 'dilution') {
    const { c1, v1, c2, v2 } = v;
    const n = [c1, v1, c2, v2].filter(x => x !== undefined && x !== "" && !isNaN(parseFloat(x))).length;

    if (n === 3) {
      if (!c1) v.c1 = ((parseFloat(c2) * parseFloat(v2)) / parseFloat(v1)).toFixed(4);
      else if (!v1) v.v1 = ((parseFloat(c2) * parseFloat(v2)) / parseFloat(c1)).toFixed(4);
      else if (!c2) v.c2 = ((parseFloat(c1) * parseFloat(v1)) / parseFloat(v2)).toFixed(4);
      else if (!v2) v.v2 = ((parseFloat(c1) * parseFloat(v1)) / parseFloat(c2)).toFixed(4);
    }
  } else {
    // Molarity: Mass = Conc * Vol * MW
    const { c, v: vol, mw, m } = v;
    const n = [c, vol, mw, m].filter(x => x !== undefined && x !== "" && !isNaN(parseFloat(x))).length;

    if (n === 3) {
      const nc = parseFloat(c);
      const nv = parseFloat(vol);
      const nmw = parseFloat(mw);
      const nm = parseFloat(m);

      if (!c) v.c = (nm / (nv * nmw)).toFixed(4);
      else if (!vol) v.v = (nm / (nc * nmw)).toFixed(4);
      else if (!mw) v.mw = (nm / (nc * nv)).toFixed(4);
      else if (!m) v.m = (nc * nv * nmw).toFixed(4);
    }
  }
  
  // Remove non-finite results
  Object.keys(v).forEach(k => {
    if (v[k] === "NaN" || v[k] === "Infinity" || v[k] === "-Infinity") v[k] = "";
  });

  return v;
}
