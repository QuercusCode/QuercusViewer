import React, { useState, useEffect } from 'react';
import { Zap, X, Move, Info } from 'lucide-react';
import { performCalculation } from '../../lib/calcUtils';

interface FloatingCalculatorProps {
  onClose: () => void;
}

export const FloatingCalculator: React.FC<FloatingCalculatorProps> = ({ onClose }) => {
  const [type, setType] = useState<'dilution' | 'molarity' | 'basic'>('dilution');
  const [values, setValues] = useState<Record<string, string>>({});
  const [targetField, setTargetField] = useState<string | null>(null);
  const [units, setUnits] = useState({
    c1: 'mM', v1: 'mL', c2: 'mM', v2: 'mL',
    c: 'mM', v: 'mL', mw: 'g/mol', m: 'mg'
  });

  // Basic Math Mode State
  const [display, setDisplay] = useState('');
  const [result, setResult] = useState<string | null>(null);

  // Position state for dragging
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

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
    setValues(result.values);
    setTargetField(result.targetField);
  };

  const handleUpdateUnit = (key: string, unit: string) => {
    const newUnits = { ...units, [key]: unit };
    setUnits(newUnits);
    const result = performCalculation(type, values, newUnits, targetField);
    setValues(result.values);
  };

  const toggleType = (newType: 'dilution' | 'molarity' | 'basic') => {
    if (newType === type) return;
    setType(newType);
    setValues({});
    setTargetField(null);
    setDisplay('');
    setResult(null);
  };

  const handleKeyClick = (key: string) => {
    if (key === '=') {
      try {
        // Simple evaluator for basic math
        const evalResult = eval(display.replace(/[^-+/*0-9.]/g, ''));
        setResult(evalResult.toString());
        setDisplay(evalResult.toString());
      } catch {
        setResult('Error');
      }
    } else if (key === 'C') {
      setDisplay('');
      setResult(null);
    } else {
      setDisplay(prev => prev + key);
    }
  };

  return (
    <div 
      className="fixed z-[100] w-72 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-shadow select-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      {/* Drag Handle Header */}
      <div 
        onMouseDown={handleMouseDown}
        className="px-4 py-2.5 bg-blue-500/10 border-b border-[var(--border-main)] flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-blue-500/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Move className="w-3 h-3 text-blue-400 opacity-50" />
          <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Lab Tool</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 rounded-md transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="p-3 border-b border-[var(--border-main)] bg-[var(--bg-main)]/30">
        <div className="flex bg-[var(--bg-main)] p-0.5 rounded-lg border border-[var(--border-main)] shadow-inner overflow-hidden">
          <button 
            onClick={() => toggleType('dilution')}
            className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tight rounded-md transition-all ${type === 'dilution' ? 'bg-blue-500/10 text-blue-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            Dilution
          </button>
          <button 
            onClick={() => toggleType('molarity')}
            className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tight rounded-md transition-all ${type === 'molarity' ? 'bg-blue-500/10 text-blue-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            Molarity
          </button>
          <button 
            onClick={() => toggleType('basic')}
            className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tight rounded-md transition-all ${type === 'basic' ? 'bg-blue-500/10 text-blue-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            Standard
          </button>
        </div>
      </div>

      {/* Inputs / Keypad */}
      <div className="p-4 space-y-3">
        {type === 'basic' ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-3 min-h-[60px] flex flex-col items-end justify-center">
              <div className="text-[var(--text-muted)] text-[10px] font-mono mb-1 truncate w-full text-right">{display || '0'}</div>
              <div className="text-[var(--text-primary)] text-xl font-bold font-mono truncate w-full text-right">{result || display || '0'}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+', 'C'].map((k) => (
                <button
                  key={k}
                  onClick={() => handleKeyClick(k)}
                  className={`h-10 rounded-lg text-xs font-bold transition-all shadow-sm ${
                    k === '=' 
                      ? 'col-span-1 bg-blue-500 text-white hover:bg-blue-400' 
                      : k === 'C'
                      ? 'col-span-4 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                      : ['/', '*', '-', '+'].includes(k)
                      ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                      : 'bg-[var(--bg-main)] text-[var(--text-primary)] hover:bg-[var(--input-bg)] border border-[var(--border-main)]'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {type === 'dilution' ? (
              <>
                <MiniField label="C1" value={values.c1} unit={units.c1} onValueChange={(v: string) => handleUpdateValue('c1', v)} onUnitChange={(u: string) => handleUpdateUnit('c1', u)} unitType="conc" isTarget={targetField === 'c1'} />
                <MiniField label="V1" value={values.v1} unit={units.v1} onValueChange={(v: string) => handleUpdateValue('v1', v)} onUnitChange={(u: string) => handleUpdateUnit('v1', u)} unitType="vol" isTarget={targetField === 'v1'} />
                <MiniField label="C2" value={values.c2} unit={units.c2} onValueChange={(v: string) => handleUpdateValue('c2', v)} onUnitChange={(u: string) => handleUpdateUnit('c2', u)} unitType="conc" isTarget={targetField === 'c2'} />
                <MiniField label="V2" value={values.v2} unit={units.v2} onValueChange={(v: string) => handleUpdateValue('v2', v)} onUnitChange={(u: string) => handleUpdateUnit('v2', u)} unitType="vol" isTarget={targetField === 'v2'} />
              </>
            ) : (
              <>
                <MiniField label="Conc" value={values.c} unit={units.c} onValueChange={(v: string) => handleUpdateValue('c', v)} onUnitChange={(u: string) => handleUpdateUnit('c', u)} unitType="conc" isTarget={targetField === 'c'} />
                <MiniField label="Vol" value={values.v} unit={units.v} onValueChange={(v: string) => handleUpdateValue('v', v)} onUnitChange={(u: string) => handleUpdateUnit('v', u)} unitType="vol" isTarget={targetField === 'v'} />
                <MiniField label="MW" value={values.mw} unit={units.mw} onValueChange={(v: string) => handleUpdateValue('mw', v)} onUnitChange={(u: string) => handleUpdateUnit('mw', u)} unitType="mw" isTarget={targetField === 'mw'} />
                <MiniField label="Mass" value={values.m} unit={units.m} onValueChange={(v: string) => handleUpdateValue('m', v)} onUnitChange={(u: string) => handleUpdateUnit('m', u)} unitType="mass" isTarget={targetField === 'm'} />
              </>
            )}
          </div>
        )}

        {/* Info Footer */}
        {type !== 'basic' && (
          <div className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors ${targetField ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-blue-500/5 border-blue-500/10'}`}>
            {targetField ? <Zap className="w-2.5 h-2.5 text-emerald-400" /> : <Info className="w-2.5 h-2.5 text-blue-400/50" />}
            <p className="text-[9px] text-[var(--text-muted)] leading-tight">
              {targetField ? `Solved for ${targetField.toUpperCase()}` : "Fill 3 fields to solve"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const UNIT_OPTIONS = {
  vol: ['mL', 'µL', 'L'],
  conc: ['mM', 'µM', 'nM', 'M'],
  mass: ['mg', 'g', 'µg'],
  mw: ['g/mol']
};

const MiniField = ({ label, value, unit, onValueChange, onUnitChange, unitType, isTarget }: any) => {
  const options = UNIT_OPTIONS[unitType as keyof typeof UNIT_OPTIONS] || [];
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 text-[9px] font-black uppercase text-center py-1 rounded-md ${isTarget ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--input-bg)] text-[var(--text-muted)]'}`}>
        {label}
      </div>
      <div className={`flex-1 relative flex items-center border rounded-lg overflow-hidden transition-all ${isTarget ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[var(--border-main)] bg-[var(--input-bg)]'}`}>
        <input 
          type="text"
          value={value || ''}
          placeholder={isTarget ? '...' : ''}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full h-7 bg-transparent px-2 text-xs text-[var(--text-primary)] focus:outline-none font-mono"
        />
        <select 
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="bg-transparent text-[8px] font-bold text-blue-400 px-1 border-l border-[var(--border-main)] focus:outline-none cursor-pointer"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    </div>
  );
};
