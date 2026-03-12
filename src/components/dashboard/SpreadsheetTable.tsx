import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Table } from '@tiptap/extension-table'
import { useState, useMemo, useEffect } from 'react'
import { 
  Plus, Trash2, Download, Maximize2, Settings, 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Type,
  ChevronDown, Activity
} from 'lucide-react'

const SpreadsheetTableComponent = ({ node, editor, getPos, deleteNode }: any) => {
  const [rowCount, setRowCount] = useState(1);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [cellValue, setCellValue] = useState("");
  
  const rows = node.childCount;
  const cols = node.firstChild ? node.firstChild.childCount : 0;
  
  const cellWidth = 140;
  const indexWidth = 48;
  const headerHeight = 32;

  const letters = useMemo(() => {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  }, []);

  // Track active cell and its address (A1, B3, etc.)
  useEffect(() => {
    const handleSelectionUpdate = () => {
      if (typeof getPos !== 'function') return;
      
      const { selection } = editor.state;
      const pos = getPos();
      
      // Check if selection is within THIS table
      if (selection.from >= pos && selection.to <= pos + node.nodeSize) {
        let foundAddress: string | null = null;
        let foundContent = "";

        // Better logic: traverse the node structure and compare positions
        let currentPos = pos + 1; // start after table open tag
        let targetCell: any = null;
        let targetRowIdx = -1;
        let targetColIdx = -1;

        for (let r = 0; r < node.childCount; r++) {
          const row = node.child(r);
          currentPos += 1; // row open tag
          for (let c = 0; c < row.childCount; c++) {
            const cell = row.child(c);
            // Check if selection start is inside this cell
            if (selection.from >= currentPos && selection.from <= currentPos + cell.nodeSize) {
              targetRowIdx = r;
              targetColIdx = c;
              targetCell = cell;
            }
            currentPos += cell.nodeSize;
          }
          currentPos += 1; // row close tag
        }

        if (targetRowIdx !== -1) {
          const colLetter = letters[targetColIdx] || `C${targetColIdx + 1}`;
          foundAddress = `${colLetter}${targetRowIdx + 1}`;
          foundContent = targetCell.textContent || "";
        }

        setActiveCell(foundAddress);
        setCellValue(foundContent);
      } else {
        setActiveCell(null);
        setCellValue("");
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => editor.off('selectionUpdate', handleSelectionUpdate);
  }, [editor, getPos, node, letters]);

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

  const toolbarAction = (action: string) => {
    const chain = editor.chain().focus();
    switch(action) {
      case 'bold': chain.toggleBold().run(); break;
      case 'italic': chain.toggleItalic().run(); break;
      case 'underline': chain.toggleUnderline().run(); break;
      case 'strike': chain.toggleStrike().run(); break;
      case 'alignLeft': chain.setTextAlign('left').run(); break;
      case 'alignCenter': chain.setTextAlign('center').run(); break;
      case 'alignRight': chain.setTextAlign('right').run(); break;
    }
  };

  return (
    <NodeViewWrapper className="spreadsheet-premium-wrapper my-12 group/spreadsheet relative">
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xl transition-all group-hover/spreadsheet:border-neutral-300">
        
        {/* TOP HEADER: Title & Global Actions */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#fdfdfd] border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              defaultValue="Goldengate table2" 
              className="text-xs font-bold text-neutral-800 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1 w-64"
            />
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-neutral-100 text-neutral-500 rounded transition-colors" title="Download CSV"><Download className="w-3.5 h-3.5" /></button>
            <button className="p-1.5 hover:bg-neutral-100 text-neutral-500 rounded transition-colors" title="Export PDF"><Activity className="w-3.5 h-3.5" /></button>
            <button className="p-1.5 hover:bg-neutral-100 text-neutral-500 rounded transition-colors" title="Expand"><Maximize2 className="w-3.5 h-3.5" /></button>
            <ToolbarDivider />
            <button 
              onClick={() => deleteNode()}
              className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded transition-colors" 
              title="Remove Spreadsheet"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TOOLBAR: Formatting & Alignment */}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-[#f8f9fa] border-b border-neutral-200 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-0.5 pr-2 border-r border-neutral-200">
            <button onClick={() => toolbarAction('bold')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => toolbarAction('italic')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => toolbarAction('underline')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><UnderlineIcon className="w-3.5 h-3.5" /></button>
            <button onClick={() => toolbarAction('strike')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><Strikethrough className="w-3.5 h-3.5" /></button>
            <button className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><LinkIcon className="w-3.5 h-3.5" /></button>
          </div>

          <div className="flex items-center gap-0.5 px-2 border-r border-neutral-200">
            <button className="flex items-center gap-1 pl-1.5 pr-1 py-1 hover:bg-neutral-200 text-neutral-700 rounded transition-colors">
              <Type className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-50" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 px-2 border-r border-neutral-200">
            <button onClick={() => toolbarAction('alignLeft')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><AlignLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => toolbarAction('alignCenter')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><AlignCenter className="w-3.5 h-3.5" /></button>
            <button onClick={() => toolbarAction('alignRight')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><AlignRight className="w-3.5 h-3.5" /></button>
          </div>

          <button className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors ml-1"><Settings className="w-3.5 h-3.5" /></button>
        </div>

        {/* FORMULA BAR */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-neutral-200">
          <div className="flex items-center justify-center w-10 h-6 bg-blue-50 text-[10px] font-bold text-blue-600 rounded border border-blue-200 uppercase">
            {activeCell || '...'}
          </div>
          <div className="flex items-center gap-1 text-neutral-400">
            <span className="italic font-serif text-sm px-1.5 text-neutral-500">$f_x$</span>
            <ChevronDown className="w-3 h-3" />
          </div>
          <input 
            type="text" 
            placeholder="Data or formula..." 
            className="flex-1 bg-transparent border-none focus:outline-none text-xs text-neutral-700 placeholder:text-neutral-300"
            value={cellValue}
            readOnly
          />
        </div>

        {/* Spreadsheet Area */}
        <div className="overflow-x-auto custom-scrollbar">
          <div 
            className="relative min-w-full"
            style={{ 
              paddingLeft: indexWidth,
              paddingTop: headerHeight
            }}
          >
            {/* Column Headers Overlay */}
            <div 
              className="absolute top-0 left-0 right-0 flex border-b border-neutral-200 bg-[#f8f9fa] z-20"
              style={{ left: indexWidth, height: headerHeight }}
            >
              {Array.from({ length: cols }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-neutral-400 uppercase font-mono border-r border-neutral-200"
                  style={{ width: cellWidth }}
                >
                  {letters[i] || `C${i + 1}`}
                </div>
              ))}
            </div>

            {/* Corner Block */}
            <div 
              className="absolute top-0 left-0 bg-[#f8f9fa] border-b border-r border-neutral-200 z-30 flex items-center justify-center"
              style={{ width: indexWidth, height: headerHeight }}
            >
              <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            {/* NATIVE TABLE */}
            <table className="spreadsheet-native-table">
              <NodeViewContent as={('tbody' as any)} className="spreadsheet-tbody" />
            </table>
          </div>
        </div>

        {/* Footer: Row Operations */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={rowCount}
              onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 h-7 bg-white border border-neutral-200 rounded px-2 text-xs text-neutral-800 focus:outline-none focus:border-blue-500/50"
            />
            <button 
              onClick={addRows}
              className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded text-[10px] font-bold transition-colors"
            >
              Add rows
            </button>
          </div>
          <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest">
            {rows} rows
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
        /* Row Number Overlay */
        .spreadsheet-native-table tr::before {
          content: counter(spreadsheet-row);
          counter-increment: spreadsheet-row;
          position: absolute;
          left: -${indexWidth}px;
          top: 0;
          bottom: 0;
          width: ${indexWidth}px;
          background: #f8f9fa;
          border-right: 1px solid #e5e5e5;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: ui-monospace, monospace;
          font-size: 10px;
          font-weight: 500;
          color: #737373;
          pointer-events: none;
          user-select: none;
          z-index: 10;
        }
        .spreadsheet-native-table td {
          border: 1px solid #e5e5e5 !important;
          padding: 8px 12px !important;
          width: ${cellWidth}px;
          min-width: ${cellWidth}px;
          height: 36px;
          vertical-align: middle;
          background: #ffffff;
          position: relative;
        }
        .spreadsheet-native-table td p {
          margin: 0 !important;
          font-size: 12px;
          color: #333 !important;
          line-height: 1.4;
        }
        .selectedCell {
          background: rgba(59, 130, 246, 0.05) !important;
        }
        .selectedCell::after {
          content: "";
          position: absolute;
          inset: -1px;
          border: 2px solid #3b82f6 !important;
          z-index: 20;
          pointer-events: none;
        }
        /* Corner handle */
        .selectedCell::before {
          content: "";
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 6px;
          height: 6px;
          background: #3b82f6;
          border: 1px solid white;
          z-index: 21;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </NodeViewWrapper>
  )
}

const ToolbarDivider = () => <div className="w-px h-4 bg-neutral-200 mx-1" />

export const SpreadsheetTable = Table.extend({
  addNodeView() {
    return ReactNodeViewRenderer(SpreadsheetTableComponent)
  },
})
