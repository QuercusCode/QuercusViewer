import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Calculator, Zap, Trash2, Info } from 'lucide-react';

// --- Tiptap Extension ---

export const LabCalculator = Node.create({
  name: 'labCalculator',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      type: {
        default: 'dilution',
        parseHTML: element => element.getAttribute('data-calc-type') || 'dilution',
        renderHTML: attributes => ({ 'data-calc-type': attributes.type }),
      },
      values: {
        default: {},
        parseHTML: element => {
          try {
            return JSON.parse(element.getAttribute('data-values') || '{}');
          } catch { return {}; }
        },
        renderHTML: attributes => ({ 'data-values': JSON.stringify(attributes.values) }),
      },
      units: {
        default: {
          c1: 'mM', v1: 'mL', c2: 'mM', v2: 'mL',
          c: 'mM', v: 'mL', mw: 'g/mol', m: 'mg'
        },
        parseHTML: element => {
          try {
            return JSON.parse(element.getAttribute('data-units') || '{}');
          } catch { return {}; }
        },
        renderHTML: attributes => ({ 'data-units': JSON.stringify(attributes.units) }),
      },
      targetField: {
        default: null,
        parseHTML: element => element.getAttribute('data-target-field') || null,
        renderHTML: attributes => ({ 'data-target-field': attributes.targetField }),
      }
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

  addStorage() {
    return {
      markdown: {
        serialize: (state: any, node: any) => {
          const payload = JSON.stringify({
            type: node.attrs.type,
            values: node.attrs.values,
            units: node.attrs.units,
            targetField: node.attrs.targetField
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
  const { type, values, units, targetField } = node.attrs;

  const handleUpdateValue = (key: string, val: string) => {
    // 1. Update the literal value
    const newValues = { ...values, [key]: val };
    
    // 2. Determine if we should solve for a target
    const fields = type === 'dilution' ? ['c1', 'v1', 'c2', 'v2'] : ['c', 'v', 'mw', 'm'];
    const filledFields = fields.filter(f => newValues[f] !== undefined && newValues[f] !== "" && !isNaN(parseFloat(newValues[f])));
    
    let newTarget = targetField;

    // If we just edited the current target, it's no longer the target (unless it's the only option)
    if (key === targetField) {
      newTarget = null;
    }

    // Logic: If 3 fields are filled and 1 is empty, the empty one becomes target
    if (filledFields.length === 3) {
      const empty = fields.find(f => !filledFields.includes(f));
      if (empty) newTarget = empty;
    }

    // 3. Perform calculation
    const result = performCalculation(type, newValues, units, newTarget);
    
    updateAttributes({ 
      values: result.values,
      targetField: result.targetField
    });
  };

  const handleUpdateUnit = (key: string, unit: string) => {
    const newUnits = { ...units, [key]: unit };
    // Recalculate with new units keeping values the same
    const result = performCalculation(type, values, newUnits, targetField);
    updateAttributes({ 
      units: newUnits,
      values: result.values
    });
  };

  const toggleType = () => {
    updateAttributes({ 
      type: type === 'dilution' ? 'molarity' : 'dilution',
      values: {},
      targetField: null
    });
  };

  const clear = () => updateAttributes({ values: {}, targetField: null });

  return (
    <NodeViewWrapper className="lab-calculator-wrapper my-8 group relative select-none">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-xl transition-all group-hover:border-blue-500/30">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/5 border-b border-[var(--border-main)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg shadow-inner">
                <Calculator className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex bg-[var(--bg-main)] p-0.5 rounded-lg border border-[var(--border-main)] shadow-inner">
              <button 
                onClick={() => type !== 'dilution' && toggleType()}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${type === 'dilution' ? 'bg-blue-500/10 text-blue-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Dilution
              </button>
              <button 
                onClick={() => type !== 'molarity' && toggleType()}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${type === 'molarity' ? 'bg-blue-500/10 text-blue-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Molarity
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={clear} className="p-1.5 hover:bg-amber-500/10 text-[var(--text-muted)] hover:text-amber-400 rounded-lg transition-all" title="Clear Values">
              <Zap className="w-3 h-3" />
            </button>
            <button onClick={deleteNode} className="p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 rounded-lg transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Form Grid */}
        <div className="p-5">
           <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {type === 'dilution' ? (
                <>
                  <CalcField label="Initial Conc. (C1)" value={values.c1} unit={units.c1} onValueChange={(v: string) => handleUpdateValue('c1', v)} onUnitChange={(u: string) => handleUpdateUnit('c1', u)} unitType="conc" isTarget={targetField === 'c1'} />
                  <CalcField label="Initial Vol. (V1)" value={values.v1} unit={units.v1} onValueChange={(v: string) => handleUpdateValue('v1', v)} onUnitChange={(u: string) => handleUpdateUnit('v1', u)} unitType="vol" isTarget={targetField === 'v1'} />
                  <CalcField label="Final Conc. (C2)" value={values.c2} unit={units.c2} onValueChange={(v: string) => handleUpdateValue('c2', v)} onUnitChange={(u: string) => handleUpdateUnit('c2', u)} unitType="conc" isTarget={targetField === 'c2'} />
                  <CalcField label="Final Vol. (V2)" value={values.v2} unit={units.v2} onValueChange={(v: string) => handleUpdateValue('v2', v)} onUnitChange={(u: string) => handleUpdateUnit('v2', u)} unitType="vol" isTarget={targetField === 'v2'} />
                </>
              ) : (
                <>
                  <CalcField label="Desired Conc." value={values.c} unit={units.c} onValueChange={(v: string) => handleUpdateValue('c', v)} onUnitChange={(u: string) => handleUpdateUnit('c', u)} unitType="conc" isTarget={targetField === 'c'} />
                  <CalcField label="Target Vol." value={values.v} unit={units.v} onValueChange={(v: string) => handleUpdateValue('v', v)} onUnitChange={(u: string) => handleUpdateUnit('v', u)} unitType="vol" isTarget={targetField === 'v'} />
                  <CalcField label="Mol. Weight" value={values.mw} unit={units.mw} onValueChange={(v: string) => handleUpdateValue('mw', v)} onUnitChange={(u: string) => handleUpdateUnit('mw', u)} unitType="mw" isTarget={targetField === 'mw'} />
                  <CalcField label="Required Mass" value={values.m} unit={units.m} onValueChange={(v: string) => handleUpdateValue('m', v)} onUnitChange={(u: string) => handleUpdateUnit('m', u)} unitType="mass" isTarget={targetField === 'm'} />
                </>
              )}
           </div>

           {/* Info Footer */}
           <div className={`mt-5 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${targetField ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-blue-500/5 border-blue-500/10'}`}>
              {targetField ? <Zap className="w-3 h-3 text-emerald-400" /> : <Info className="w-3 h-3 text-blue-400/50" />}
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                {targetField 
                  ? `Calculated ${targetField.toUpperCase()} automatically. Change other fields to update it.`
                  : "Fill any 3 fields to calculate the 4th automatically. Use dropdowns for units."}
              </p>
           </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// --- Sub-components & Helpers ---

const UNIT_OPTIONS = {
  vol: ['mL', 'µL', 'L'],
  conc: ['mM', 'µM', 'nM', 'M'],
  mass: ['mg', 'g', 'µg'],
  mw: ['g/mol']
};

const CalcField = ({ label, value, unit, onValueChange, onUnitChange, unitType, isTarget }: any) => {
  const options = UNIT_OPTIONS[unitType as keyof typeof UNIT_OPTIONS] || [];
  
  return (
    <div className="space-y-1.5 flex-1">
      <div className="flex items-center justify-between px-1">
        <label className={`text-[9px] font-bold uppercase tracking-tight transition-colors ${isTarget ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
          {label} {isTarget && '(Result)'}
        </label>
      </div>
      <div className={`relative flex items-center group/field border transition-all rounded-xl overflow-hidden ${isTarget ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[var(--border-main)] bg-[var(--input-bg)] focus-within:border-blue-500/50'}`}>
        <input 
          type="text"
          value={value || ''}
          placeholder={isTarget ? 'Calculating...' : 'Enter...'}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full h-10 bg-transparent px-4 pr-16 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none font-mono"
        />
        
        {/* Unit Selector */}
        <div className="absolute right-1 top-1 bottom-1 flex items-center">
          <select 
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="h-full bg-[var(--bg-main)] border-l border-[var(--border-main)] px-2 text-[10px] font-bold text-blue-400 cursor-pointer focus:outline-none hover:bg-blue-500/10 transition-colors rounded-r-lg appearance-none min-w-[45px] text-center"
          >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

// --- Math Engine ---

const U_CONV: Record<string, Record<string, number>> = {
  // To Base (Liters, Molar, Grams)
  vol: { 'mL': 0.001, 'µL': 0.000001, 'L': 1 },
  conc: { 'mM': 0.001, 'µM': 0.000001, 'nM': 0.000000001, 'M': 1 },
  mass: { 'mg': 0.001, 'g': 1, 'µg': 0.000001 },
  mw: { 'g/mol': 1 }
};

function performCalculation(type: string, vals: Record<string, string>, units: Record<string, string>, target: string | null) {
  const v = { ...vals };
  
  // Normalize all to base units
  const base: Record<string, number> = {};
  const fields = type === 'dilution' ? ['c1', 'v1', 'c2', 'v2'] : ['c', 'v', 'mw', 'm'];
  
  fields.forEach(f => {
    const rawVal = parseFloat(v[f]);
    if (!isNaN(rawVal)) {
      const uType = f.startsWith('c') ? 'conc' : f.startsWith('v') ? 'vol' : f === 'm' ? 'mass' : 'mw';
      const factor = U_CONV[uType]?.[units[f]] || 1;
      base[f] = rawVal * factor;
    }
  });

  if (target) {
    if (type === 'dilution') {
      // C1V1 = C2V2
      if (target === 'c1' && base.v1 && base.c2 && base.v2) base.c1 = (base.c2 * base.v2) / base.v1;
      else if (target === 'v1' && base.c1 && base.c2 && base.v2) base.v1 = (base.c2 * base.v2) / base.c1;
      else if (target === 'c2' && base.c1 && base.v1 && base.v2) base.c2 = (base.c1 * base.v1) / base.v2;
      else if (target === 'v2' && base.c1 && base.v1 && base.c2) base.v2 = (base.c1 * base.v1) / base.c2;
    } else {
      // Molarity: Mass = Conc * Vol * MW
      if (target === 'c' && base.v && base.mw && base.m) base.c = base.m / (base.v * base.mw);
      else if (target === 'v' && base.c && base.mw && base.m) base.v = base.m / (base.c * base.mw);
      else if (target === 'mw' && base.c && base.v && base.m) base.mw = base.m / (base.c * base.v);
      else if (target === 'm' && base.c && base.v && base.mw) base.m = base.c * base.v * base.mw;
    }

    // Convert base result back to target unit
    const uType = target.startsWith('c') ? 'conc' : target.startsWith('v') ? 'vol' : target === 'm' ? 'mass' : 'mw';
    const factor = U_CONV[uType]?.[units[target]] || 1;
    v[target] = (base[target] / factor).toFixed(4);
  }

  // Cleanup
  Object.keys(v).forEach(k => {
    if (v[k] === "NaN" || v[k] === "Infinity" || v[k] === "-Infinity") v[k] = "";
  });

  return { values: v, targetField: target };
}
