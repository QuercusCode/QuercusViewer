import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Calculator, Zap, Trash2, Info } from 'lucide-react';
import { performCalculation } from '../../lib/calcUtils';
import { useTranslation } from '../../lib/i18n';

// --- Tiptap Extension ---

export const LabCalculator = Node.create({
  name: 'labCalculator',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      type: {
        default: 'dilution',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-calc-type') || 'dilution',
        renderHTML: (attributes: Record<string, any>) => ({ 'data-calc-type': attributes.type }),
      },
      values: {
        default: {},
        parseHTML: (element: HTMLElement) => {
          try {
            return JSON.parse(element.getAttribute('data-values') || '{}');
          } catch { return {}; }
        },
        renderHTML: (attributes: Record<string, any>) => ({ 'data-values': JSON.stringify(attributes.values) }),
      },
      units: {
        default: {
          c1: 'mM', v1: 'mL', c2: 'mM', v2: 'mL',
          c: 'mM', v: 'mL', mw: 'g/mol', m: 'mg'
        },
        parseHTML: (element: HTMLElement) => {
          try {
            return JSON.parse(element.getAttribute('data-units') || '{}');
          } catch { return {}; }
        },
        renderHTML: (attributes: Record<string, any>) => ({ 'data-units': JSON.stringify(attributes.units) }),
      },
      targetField: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-target-field') || null,
        renderHTML: (attributes: Record<string, any>) => ({ 'data-target-field': attributes.targetField }),
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="lab-calculator"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
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
          const base64 = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(payload))) : Buffer.from(payload).toString('base64');
          state.write(`\n\`\`\`lab-calculator\n${base64}\n\`\`\`\n`);
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
                if (token.info === 'lab-calculator') {
                  try {
                    const base64 = token.content.trim();
                    const jsonStr = typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(base64))) : Buffer.from(base64, 'base64').toString('utf8');
                    const attrs = JSON.parse(jsonStr);
                    const escapeHtml = (str: string) => String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                    // Using single quotes for JSON strings inside attributes to avoid breaking
                    return `<div data-type="lab-calculator" data-calc-type="${escapeHtml(attrs.type || '')}" data-values="${escapeHtml(JSON.stringify(attrs.values || {}))}" data-units="${escapeHtml(JSON.stringify(attrs.units || {}))}" data-target-field="${escapeHtml(attrs.targetField || '')}"></div>`;
                  } catch (e) {
                    console.error('Failed to parse lab-calculator:', e);
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

// --- Component ---

const LabCalculatorComponent = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const { type, values, units, targetField } = node.attrs;

  const handleUpdateValue = (key: string, val: string) => {
    const newValues = { ...values, [key]: val };
    const fields = type === 'dilution' ? ['c1', 'v1', 'c2', 'v2'] : ['c', 'v', 'mw', 'm'];
    const filledFields = fields.filter(f => newValues[f] !== undefined && newValues[f] !== "" && !isNaN(parseFloat(newValues[f])));
    
    let newTarget = targetField;
    if (key === targetField) newTarget = null;

    if (filledFields.length === 3) {
      const empty = fields.find(f => !filledFields.includes(f));
      if (empty) newTarget = empty;
    }

    const result = performCalculation(type, newValues, units, newTarget);
    updateAttributes({ 
      values: result.values,
      targetField: result.targetField
    });
  };

  const handleUpdateUnit = (key: string, unit: string) => {
    const newUnits = { ...units, [key]: unit };
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

interface CalcFieldProps {
  label: string;
  value: string;
  unit: string;
  onValueChange: (val: string) => void;
  onUnitChange: (unit: string) => void;
  unitType: string;
  isTarget: boolean;
}

const CalcField = ({ label, value, unit, onValueChange, onUnitChange, unitType, isTarget }: CalcFieldProps) => {
  const { t } = useTranslation();
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
          placeholder={isTarget ? t.calcCalculating as string : t.calcEnter as string}
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
