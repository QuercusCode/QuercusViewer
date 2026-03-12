import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Table } from '@tiptap/extension-table'
import { useState, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'

const SpreadsheetTableComponent = ({ node, editor, getPos, deleteNode }: any) => {
  const [rowCount, setRowCount] = useState(1);
  const rows = node.childCount;
  const cols = node.firstChild ? node.firstChild.childCount : 0;
  
  const cellWidth = 120;
  const indexWidth = 48;
  const headerHeight = 32;

  const addRows = () => {
    if (typeof getPos !== 'function') return;
    const tablePos = getPos();
    const tableEnd = tablePos + node.nodeSize;
    
    editor.chain()
      .focus()
      .setTextSelection(tableEnd - 4) 
      .run();

    for (let i = 0; i < rowCount; i++) {
      editor.commands.addRowAfter();
    }
  };

  const letters = useMemo(() => {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  }, []);

  return (
    <NodeViewWrapper className="spreadsheet-table-wrapper my-12 group/spreadsheet relative">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl transition-all group-hover/spreadsheet:border-neutral-700">
        {/* Superior Header: Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-neutral-800/80 border-b border-neutral-800 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Plus className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs font-black text-neutral-300 uppercase tracking-[0.2em]">Lab Spreadsheet</span>
          </div>
          <button 
            onClick={() => deleteNode()}
            className="p-2 hover:bg-red-500/15 text-neutral-500 hover:text-red-400 rounded-lg transition-all active:scale-90"
            title="Remove Spreadsheet"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Spreadsheet Area */}
        <div className="overflow-x-auto custom-scrollbar bg-white">
          <div 
            className="relative min-w-full"
            style={{ 
              paddingLeft: indexWidth,
              paddingTop: headerHeight
            }}
          >
            {/* Column Headers (A, B, C...) Overlay */}
            <div 
              className="absolute top-0 left-0 right-0 flex border-b border-neutral-200 bg-neutral-50 z-20"
              style={{ left: indexWidth, height: headerHeight }}
            >
              {Array.from({ length: cols }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-neutral-500 uppercase font-mono border-r border-neutral-200"
                  style={{ width: cellWidth }}
                >
                  {letters[i] || `C${i + 1}`}
                </div>
              ))}
            </div>

            {/* Corner ID Block */}
            <div 
              className="absolute top-0 left-0 bg-neutral-100 border-b border-r border-neutral-200 z-30 flex items-center justify-center"
              style={{ width: indexWidth, height: headerHeight }}
            >
              <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            {/* NATIVE TABLE: Strictly standard table structure for Tiptap compatibility */}
            <table className="spreadsheet-native-table">
              <NodeViewContent as="tbody" className="spreadsheet-tbody" />
            </table>
          </div>
        </div>

        {/* Footer: Row Operations */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden h-9">
              <input 
                type="number" 
                value={rowCount}
                onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 bg-transparent px-3 text-sm text-white focus:outline-none placeholder-neutral-700"
              />
              <div className="w-px h-4 bg-neutral-800" />
              <button 
                onClick={addRows}
                className="px-4 text-[11px] font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors h-full"
              >
                ADD ROWS
              </button>
            </div>
          </div>
          <div className="px-3 py-1 bg-neutral-800/50 rounded-full">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none">
              {rows} ACTIVE ROWS
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .spreadsheet-native-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          counter-reset: spreadsheet-row;
        }
        .spreadsheet-native-table tr {
          position: relative;
          display: table-row !important;
        }
        /* Row Number Overlay: Absolute positioning prevents DOM index interference */
        .spreadsheet-native-table tr::before {
          content: counter(spreadsheet-row);
          counter-increment: spreadsheet-row;
          position: absolute;
          left: -${indexWidth}px;
          top: 0;
          bottom: 0;
          width: ${indexWidth}px;
          background: #f8f9fa;
          border-right: 2px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: ui-monospace, monospace;
          font-size: 11px;
          font-weight: 800;
          color: #737373;
          pointer-events: none;
          user-select: none;
          z-index: 10;
        }
        .spreadsheet-native-table td {
          border: 1px solid #e5e5e5 !important;
          padding: 10px 14px !important;
          width: ${cellWidth}px;
          min-width: ${cellWidth}px;
          height: 44px;
          vertical-align: top;
          background: #ffffff;
          position: relative;
        }
        .spreadsheet-native-table td p {
          margin: 0 !important;
          font-size: 13px;
          color: #171717 !important;
          line-height: 1.6;
          min-height: 1em;
        }
        /* High-contrast Editor Selection */
        .selectedCell {
          background: rgba(59, 130, 246, 0.03) !important;
        }
        .selectedCell::after {
          content: "";
          position: absolute;
          inset: -1px;
          border: 2px solid #3b82f6 !important;
          z-index: 20;
          pointer-events: none;
        }
      `}</style>
    </NodeViewWrapper>
  )
}

export const SpreadsheetTable = Table.extend({
  addNodeView() {
    return ReactNodeViewRenderer(SpreadsheetTableComponent)
  },
})
