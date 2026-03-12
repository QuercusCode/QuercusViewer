import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Table } from '@tiptap/extension-table'
import { useState } from 'react'
import { Plus } from 'lucide-react'

const SpreadsheetTableComponent = ({ node, editor, getPos, deleteNode }: any) => {
  const [rowCount, setRowCount] = useState(1);
  const rows = node.childCount;
  const cols = node.firstChild ? node.firstChild.childCount : 0;

  const addRows = () => {
    if (typeof getPos !== 'function') return;
    
    // Find the end of the table to ensure we're adding rows to THIS table
    const tablePos = getPos();
    const tableEnd = tablePos + node.nodeSize;
    
    // Move selection to the very last cell of the table
    // tableEnd - 1 is the end of the table node, -2/-3 should be inside the last cell
    editor.chain()
      .focus()
      .setTextSelection(tableEnd - 4) 
      .run();

    for (let i = 0; i < rowCount; i++) {
      editor.commands.addRowAfter();
    }
  };

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <NodeViewWrapper className="spreadsheet-table-container my-8 group relative">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header bar with title and actions */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-800/50 border-b border-neutral-800">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Table</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => deleteNode()}
              className="p-1 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 rounded transition-colors"
              title="Delete Table"
            >
              <Plus className="w-3.5 h-3.5 rotate-45" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <div className="inline-block min-w-full align-middle">
            <table className="spreadsheet-table relative border-collapse">
              <thead>
                <tr>
                  <th className="bg-neutral-800/30 border border-neutral-800 w-10 min-w-[40px] h-10"></th>
                  {Array.from({ length: cols }).map((_, i) => (
                    <th key={i} className="bg-neutral-800/30 border border-neutral-800 min-w-[100px] h-10 text-[10px] font-bold text-neutral-500 uppercase font-mono">
                      {letters[i] || `C${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <NodeViewContent as={('tbody' as any)} className="spreadsheet-tbody" />
            </table>
          </div>
        </div>

        {/* Footer with Add Rows utility */}
        <div className="p-3 bg-neutral-900/50 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={rowCount}
              onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-8 bg-neutral-950 border border-neutral-800 rounded px-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <button 
              onClick={addRows}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add rows</span>
            </button>
          </div>
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
            {rows} rows
          </span>
        </div>
      </div>

      <style>{`
        .spreadsheet-table-container table {
          margin: 0 !important;
          width: 100% !important;
          background: #ffffff;
          border-spacing: 0;
          border-collapse: separate;
        }
        .spreadsheet-table-container tr {
          display: table-row;
        }
        .spreadsheet-table-container th, 
        .spreadsheet-table-container td {
          border: 1px solid #e5e5e5 !important;
          padding: 8px 12px !important;
          min-width: 100px;
          min-height: 40px;
          position: relative;
        }
        .spreadsheet-table-container th {
          background: #f8f9fa;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-weight: 700;
          color: #737373;
          text-align: center;
          text-transform: uppercase;
        }
        /* Row Indication Column */
        .spreadsheet-table-container td:first-child, 
        .spreadsheet-table-container th:first-child {
          width: 40px;
          min-width: 40px;
          max-width: 40px;
          background: #f8f9fa;
          border-right: 2px solid #e5e5e5 !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-weight: 700;
          color: #737373;
          text-align: center;
          pointer-events: none;
          user-select: none;
        }
        .spreadsheet-table-container td p {
          margin: 0 !important;
          font-size: 13px;
          color: #171717;
          line-height: 1.5;
        }
        .spreadsheet-table-container .ProseMirror-selectednode table {
          outline: 2px solid #3b82f6 !important;
          outline-offset: -2px;
        }
        .spreadsheet-table-container .selectedCell:after {
          background: rgba(59, 130, 246, 0.1) !important;
          border: 2px solid #3b82f6 !important;
          z-index: 30;
        }
        .spreadsheet-tbody {
          counter-reset: spreadsheet-row;
        }
        /* Automagically insert row numbers in the first column of each row (handles both td and th) */
        .spreadsheet-table-container tbody tr td:first-child::before,
        .spreadsheet-table-container tbody tr th:first-child::before {
          counter-increment: spreadsheet-row;
          content: counter(spreadsheet-row);
          display: block;
          text-align: center;
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
