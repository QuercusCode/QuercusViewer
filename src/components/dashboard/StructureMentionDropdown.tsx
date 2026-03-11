import React, { useState, useEffect, useRef } from 'react';
import { Dna, Command } from 'lucide-react';
import { type Structure } from '../../lib/structuresService';

interface StructureMentionDropdownProps {
  structures: Structure[];
  query: string;
  onSelect: (structure: Structure) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export const StructureMentionDropdown: React.FC<StructureMentionDropdownProps> = ({
  structures,
  query,
  onSelect,
  onClose,
  position
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = structures.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase()) || 
    (s.metadata?.title && s.metadata.title.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div 
      ref={dropdownRef}
      className="fixed z-[100] w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 border-b border-neutral-800 bg-neutral-950/50 flex items-center gap-2">
        <Command className="w-3.5 h-3.5 text-neutral-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Insert Structure</span>
      </div>
      <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
        {filtered.map((s, i) => {
          const rcsbId = s.name.match(/^[1-9][A-Z0-9]{3}$/i)?.[0]?.toUpperCase();
          const isSelected = i === selectedIndex;
          
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left ${
                isSelected ? 'bg-blue-600/20 text-white' : 'hover:bg-neutral-800 text-neutral-400'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                {rcsbId ? (
                  <img 
                    src={`https://cdn.rcsb.org/images/structures/${rcsbId.toLowerCase()}_assembly-1.jpeg`}
                    alt="" 
                    className="w-full h-full object-cover opacity-60"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <Dna className="w-5 h-5 text-neutral-700" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.metadata?.title || s.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase">{s.file_type}</span>
                  {rcsbId && <span className="text-[10px] text-blue-400/60 font-mono">{rcsbId}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
