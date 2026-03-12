import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Dna, Command } from 'lucide-react';
import type { Structure } from '../../lib/structuresService';

export interface MentionListProps {
  items: Structure[];
  command: (props: any) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      props.command({ id: item.id, label: item.name });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="z-[100] w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-100">
      <div className="p-2 border-b border-neutral-800 bg-neutral-950/50 flex items-center gap-2">
        <Command className="w-3.5 h-3.5 text-neutral-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Insert Structure</span>
      </div>
      <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
        {props.items.map((item, index) => {
          const rcsbId = item.name.match(/^[1-9][A-Z0-9]{3}$/i)?.[0]?.toUpperCase();
          const isSelected = index === selectedIndex;

          return (
            <button
              key={item.id}
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
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
                <p className="text-sm font-medium truncate">{item.metadata?.title || item.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase">{item.file_type}</span>
                  {rcsbId && <span className="text-[10px] text-blue-400/60 font-mono">{rcsbId}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

MentionList.displayName = 'MentionList';
