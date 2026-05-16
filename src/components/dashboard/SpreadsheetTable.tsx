import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { Table } from '@tiptap/extension-table'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { 
  Trash2, Download, Maximize2, Settings, 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Type,
  ChevronDown, Activity, BarChart2, Plus, X, TrendingUp
} from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
const SpreadsheetTableComponent = ({ node, editor, getPos, deleteNode, updateAttributes }: NodeViewProps) => {
  const [rowCount, setRowCount] = useState(1);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [showChartPreview, setShowChartPreview] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedCSV, setCopiedCSV] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [chartConfig, setChartConfig] = useState<{
    type: 'line' | 'bar', 
    xCol: number, 
    yCols: number[],
    seriesColors: Record<number, string>,
    showTrendLine: boolean,
    showStatistics: boolean
  }>({ 
    type: 'line', 
    xCol: 0, 
    yCols: [1],
    seriesColors: { 1: '#3b82f6' },
    showTrendLine: false,
    showStatistics: false
  });
  const [numericCols, setNumericCols] = useState<number[]>([]);

  // Generate unique ID for table if not present for linking with charts
  useEffect(() => {
    if (!node.attrs.id && updateAttributes) {
      // Use data-id or data-table-id fallback
      const existingId = node.attrs.id;
      if (!existingId) {
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        updateAttributes({ id: newId });
      }
    }
  }, [node.attrs.id, updateAttributes]);

  // Sync linked charts whenever table data changes
  useEffect(() => {
    if (!node.attrs.id || !editor || typeof getPos !== 'function') return;

    let syncTimer: any = null;

    const getTableData = (tableNode: any) => {
      const headerRow = tableNode.firstChild;
      if (!headerRow) return [];

      const lettersArr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      
      // Determine if Row 0 is a header or data
      // Rule: It's data if it contains numbers OR if it starts with common data prefixes like 'gg' or 'Sample'
      let isDataRow = true;
      let headers: string[] = [];
      
      headerRow.forEach((cell: any, _: any, i: number) => {
        const text = cell.textContent.trim();
        headers.push(text || lettersArr[i] || `Col ${i + 1}`);
        // If it's a numeric value, it's definitely data
        if (text && !isNaN(parseFloat(text))) isDataRow = true;
        // Specific user pattern: ggME or Sample
        if (text.toLowerCase().startsWith('gg') || text.toLowerCase().startsWith('sample')) isDataRow = true;
      });

      // If we have more than 1 row and headers are purely text, maybe it IS a header row
      const hasStrictHeaderRow = tableNode.childCount > 1 && !isDataRow;

      const dataSet: any[] = [];
      const effectiveHeaders = hasStrictHeaderRow ? headers : lettersArr.map((l, i) => headers[i] || l);
      
      const startRow = hasStrictHeaderRow ? 1 : 0;
      for (let r = startRow; r < tableNode.childCount; r++) {
        const row = tableNode.child(r);
        const rowData: any = {};
        let hasContent = false;
        row.forEach((cell: any, _: any, i: number) => {
          const val = cell.textContent.trim();
          const numVal = parseFloat(val);
          rowData[effectiveHeaders[i]] = !isNaN(numVal) ? numVal : val;
          if (val) hasContent = true;
        });
        if (hasContent) dataSet.push(rowData);
      }
      return dataSet;
    };

    const handleUpdate = () => {
      if (syncTimer) clearTimeout(syncTimer);

      syncTimer = setTimeout(() => {
        if (!editor || !editor.state || typeof getPos !== 'function') return;
        
        const currentPos = getPos();
        if (typeof currentPos !== 'number') return;

        const latestNode = editor.state.doc.nodeAt(currentPos);
        if (!latestNode || (latestNode.type.name !== 'spreadsheetTable' && latestNode.type.name !== 'table')) return;

        const tableId = latestNode.attrs.id;
        if (!tableId) return;

        const tableData = getTableData(latestNode);

        // Batch updates into a single transaction
        const { tr } = editor.state;
        let modified = false;

        editor.state.doc.descendants((n: any, pos: number) => {
          if (n.type.name === 'inlineChart' && n.attrs.tableId === tableId) {
            // Check if data actually changed to avoid cycles
            if (JSON.stringify(n.attrs.data) !== JSON.stringify(tableData)) {
              tr.setNodeMarkup(pos, undefined, {
                ...n.attrs,
                data: tableData
              });
              modified = true;
            }
          }
          return true;
        });

        if (modified) {
          editor.view.dispatch(tr);
        }
      }, 400); // 400ms throttle
    };

    editor.on('update', handleUpdate);
    // Also sync on mount/activeId change to be safe
    handleUpdate();

    return () => {
      editor.off('update', handleUpdate);
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, [node.attrs.id, editor, getPos]);

  const forceSync = () => {
    if (!editor || !editor.state || typeof getPos !== 'function') return;
    const currentPos = getPos();
    if (typeof currentPos !== 'number') return;
    const latestNode = editor.state.doc.nodeAt(currentPos);
    if (!latestNode) return;

    const tableData: any[] = [];
    const headerRow = latestNode.firstChild;
    if (!headerRow) return;

    const lettersArr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const headers: string[] = [];
    headerRow.forEach((cell: any, _: any, i: number) => {
      headers.push(cell.textContent.trim() || lettersArr[i] || `Col ${i + 1}`);
    });

    for (let r = 1; r < latestNode.childCount; r++) {
      const row = latestNode.child(r);
      const rowData: any = {};
      let hasData = false;
      row.forEach((cell: any, _: any, i: number) => {
        const val = cell.textContent.trim();
        const numVal = parseFloat(val);
        rowData[headers[i]] = !isNaN(numVal) ? numVal : val;
        if (val) hasData = true;
      });
      if (hasData) tableData.push(rowData);
    }

    const { tr } = editor.state;
    let modified = false;
    editor.state.doc.descendants((n: any, pos: number) => {
      if (n.type.name === 'inlineChart' && n.attrs.tableId === latestNode.attrs.id) {
        tr.setNodeMarkup(pos, undefined, { ...n.attrs, data: tableData });
        modified = true;
      }
      return true;
    });
    if (modified) editor.view.dispatch(tr);
  };
  
  const rows = node.childCount;
  const cols = node.firstChild ? node.firstChild.childCount : 0;
  
  // Analyze columns for numeric content
  useEffect(() => {
    const numericIndices: number[] = [];
    for (let c = 0; c < cols; c++) {
      let numericCount = 0;
      let nonBlankCount = 0;

      for (let r = 1; r < node.childCount; r++) {
        const cell = node.child(r).child(c);
        const val = cell.textContent.trim();
        if (val) {
          nonBlankCount++;
          if (!isNaN(parseFloat(val))) {
            numericCount++;
          }
        }
      }

      // If at least 50% of non-blank values are numeric, consider it a numeric column
      if (nonBlankCount > 0 && numericCount / nonBlankCount > 0.5) {
        numericIndices.push(c);
      }
    }
    setNumericCols(numericIndices);
  }, [node, cols]);
  
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
      
      if (pos === undefined || pos === null) return;

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
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, getPos, node, letters]);

  const addRows = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof getPos !== 'function') return;
    const tablePos = getPos();
    if (tablePos === undefined || tablePos === null) return;
    const tableEnd = tablePos + node.nodeSize;
    
    editor.chain()
      .focus()
      .setTextSelection(tableEnd - 4) 
      .run();

    for (let i = 0; i < rowCount; i++) {
      editor.commands.addRowAfter();
    }
  };

  const toolbarAction = (e: React.MouseEvent, action: string) => {
    e.preventDefault();
    const chain = (editor as any).chain().focus();
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

  const createChart = () => {
    // Extract data from the table
    const headerRow = node.firstChild;
    if (!headerRow) return;

    // Use common logic
    const lettersArr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let isDataRow = true;
    let headers: string[] = [];
    
    headerRow.forEach((cell: any, _: any, i: number) => {
      const text = cell.textContent.trim();
      headers.push(text || lettersArr[i] || `Col ${i + 1}`);
      if (text && !isNaN(parseFloat(text))) isDataRow = true;
      if (text.toLowerCase().startsWith('gg') || text.toLowerCase().startsWith('sample')) isDataRow = true;
    });

    const hasStrictHeaderRow = node.childCount > 1 && !isDataRow;
    const effectiveHeaders = hasStrictHeaderRow ? headers : lettersArr.map((l, i) => headers[i] || l);

    const tableData: any[] = [];
    const startRow = hasStrictHeaderRow ? 1 : 0;
    
    for (let r = startRow; r < node.childCount; r++) {
      const row = node.child(r);
      const rowData: any = {};
      let hasContent = false;
      
      row.forEach((cell: any, _: any, i: number) => {
        const val = cell.textContent.trim();
        const numVal = parseFloat(val);
        rowData[effectiveHeaders[i]] = !isNaN(numVal) ? numVal : val;
        if (val) hasContent = true;
      });
      
      if (hasContent) tableData.push(rowData);
    }

    if (tableData.length === 0) {
      alert("Please add some data to the table first.");
      return;
    }

    const xAxis = effectiveHeaders[chartConfig.xCol] || headers[0];
    const yAxes = chartConfig.yCols.map(index => effectiveHeaders[index] || `Col ${index + 1}`);
    const customColors = chartConfig.yCols.map(index => chartConfig.seriesColors[index] || COLORS[0]);

    if (typeof getPos !== 'function') return;
    const pos = getPos();
    if (pos === undefined || pos === null) return;
    const tableEnd = pos + node.nodeSize;

    editor.chain()
      .focus()
      .insertContentAt(tableEnd, {
        type: 'inlineChart',
        attrs: {
          data: tableData,
          type: chartConfig.type,
          title: `Comparison Chart from ${node.attrs.title || 'Table'}`,
          xAxis,
          yAxes,
          customColors,
          showTrendLine: chartConfig.showTrendLine,
          showStatistics: chartConfig.showStatistics,
          tableId: node.attrs.id
        }
      })
      .run();

    setShowChartPreview(false);
  };

  const toggleYCol = (index: number) => {
    setChartConfig(prev => {
      const yCols = prev.yCols.includes(index)
        ? prev.yCols.filter(i => i !== index)
        : [...prev.yCols, index];
      
      const seriesColors = { ...prev.seriesColors };
      if (!seriesColors[index]) {
        seriesColors[index] = COLORS[Object.keys(seriesColors).length % COLORS.length];
      }
      return { ...prev, yCols, seriesColors };
    });
  };

  const setSeriesColor = (index: number, color: string) => {
    setChartConfig(prev => ({
      ...prev,
      seriesColors: { ...prev.seriesColors, [index]: color }
    }));
  };

  const toggleChartPreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowChartPreview(!showChartPreview);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) setShowFontMenu(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getTableRows = useCallback((): string[][] => {
    const result: string[][] = [];
    for (let r = 0; r < node.childCount; r++) {
      const row = node.child(r);
      const cells: string[] = [];
      for (let c = 0; c < row.childCount; c++) {
        cells.push(row.child(c).textContent.trim());
      }
      result.push(cells);
    }
    return result;
  }, [node]);

  const downloadCSV = (e: React.MouseEvent) => {
    e.preventDefault();
    const tableRows = getTableRows();
    const csv = tableRows.map(row =>
      row.map(v => (v.includes(',') || v.includes('"') || v.includes('\n'))
        ? `"${v.replace(/"/g, '""')}"` : v
      ).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 1500);
  };

  const columnStats = useMemo(() => {
    const tableRows = getTableRows();
    if (tableRows.length < 2) return [];
    const headers = tableRows[0];
    return headers.map((header, ci) => {
      const vals = tableRows.slice(1)
        .map(r => parseFloat(r[ci]))
        .filter(v => !isNaN(v));
      if (vals.length === 0) return null;
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const stdev = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      return { header: header || letters[ci] || `Col ${ci + 1}`, min: Math.min(...vals), max: Math.max(...vals), mean, stdev, n: vals.length };
    }).filter(Boolean);
  }, [getTableRows, letters]);

  const applyFontSize = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    (editor as any).chain().focus().setFontSize(size).run();
    setShowFontMenu(false);
  };

  const tableOp = (e: React.MouseEvent, op: string) => {
    e.preventDefault();
    const chain = (editor as any).chain().focus();
    switch (op) {
      case 'addColAfter': chain.addColumnAfter().run(); break;
      case 'addColBefore': chain.addColumnBefore().run(); break;
      case 'deleteCol': chain.deleteColumn().run(); break;
      case 'addRowAfter': chain.addRowAfter().run(); break;
      case 'deleteRow': chain.deleteRow().run(); break;
    }
    setShowSettings(false);
  };

  return (
    <NodeViewWrapper className="spreadsheet-premium-wrapper my-12 group/spreadsheet relative z-30">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-2xl transition-all group-hover/spreadsheet:border-neutral-300 relative">
        
        {/* TOP HEADER: Title & Global Actions */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#fdfdfd] border-b border-neutral-200 rounded-t-xl">
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              defaultValue="Goldengate table2" 
              className="text-xs font-bold text-neutral-800 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500/30 rounded px-1 w-64"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onMouseDown={downloadCSV}
              className={`p-1.5 rounded transition-colors ${copiedCSV ? 'bg-green-100 text-green-600' : 'hover:bg-neutral-100 text-neutral-500'}`}
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowStatsPanel(s => !s); }}
              className={`p-1.5 rounded transition-colors ${showStatsPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-neutral-100 text-neutral-500'}`}
              title="Column Statistics"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); setIsExpanded(true); }}
              className="p-1.5 hover:bg-neutral-100 text-neutral-500 rounded transition-colors"
              title="Expand Table"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <ToolbarDivider />
            <button
              onClick={(e) => { e.preventDefault(); deleteNode(); }}
              className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded transition-colors"
              title="Remove Spreadsheet"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TOOLBAR: Formatting & Alignment */}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-[#f8f9fa] border-b border-neutral-200 relative z-40">
          <div className="flex items-center gap-0.5 pr-2 border-r border-neutral-200">
            <button onMouseDown={(e) => toolbarAction(e, 'bold')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><Bold className="w-3.5 h-3.5" /></button>
            <button onMouseDown={(e) => toolbarAction(e, 'italic')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><Italic className="w-3.5 h-3.5" /></button>
            <button onMouseDown={(e) => toolbarAction(e, 'underline')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><UnderlineIcon className="w-3.5 h-3.5" /></button>
            <button onMouseDown={(e) => toolbarAction(e, 'strike')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><Strikethrough className="w-3.5 h-3.5" /></button>
            <button onMouseDown={(e) => e.preventDefault()} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><LinkIcon className="w-3.5 h-3.5" /></button>
          </div>

          <div className="flex items-center gap-0.5 px-2 border-r border-neutral-200 relative" ref={fontMenuRef}>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowFontMenu(s => !s); setShowSettings(false); }}
              className={`flex items-center gap-1 pl-1.5 pr-1 py-1 rounded transition-colors ${showFontMenu ? 'bg-neutral-200 text-neutral-900' : 'hover:bg-neutral-200 text-neutral-700'}`}
              title="Font Size"
            >
              <Type className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-50" />
            </button>
            {showFontMenu && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-neutral-200 rounded-lg shadow-xl z-[10000] py-1 animate-in fade-in zoom-in-95 duration-100">
                {['10px', '12px', '14px', '16px', '18px', '20px'].map(size => (
                  <button
                    key={size}
                    onMouseDown={(e) => applyFontSize(e, size)}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 px-2 border-r border-neutral-200">
            <button onMouseDown={(e) => toolbarAction(e, 'alignLeft')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><AlignLeft className="w-3.5 h-3.5" /></button>
            <button onMouseDown={(e) => toolbarAction(e, 'alignCenter')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><AlignCenter className="w-3.5 h-3.5" /></button>
            <button onMouseDown={(e) => toolbarAction(e, 'alignRight')} className="p-1.5 hover:bg-neutral-200 text-neutral-700 rounded transition-colors"><AlignRight className="w-3.5 h-3.5" /></button>
          </div>

          {/* Chart Creator Dropdown */}
          <div className="relative">
            <button 
              onMouseDown={toggleChartPreview}
              className={`flex items-center gap-1.5 px-3 py-1.5 ml-1 rounded-lg transition-all text-[10px] font-bold ${showChartPreview ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Visualize</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showChartPreview ? 'rotate-180' : ''}`} />
            </button>

            {showChartPreview && (
              <div 
                className="absolute top-full left-0 mt-3 w-80 max-h-[520px] overflow-y-auto bg-white/90 backdrop-blur-xl border border-neutral-200 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-5 z-[10000] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200 custom-scrollbar"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Chart Settings</h4>
                  <button onClick={() => setShowChartPreview(false)} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-2">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setChartConfig(prev => ({ ...prev, type: 'line' }))}
                        className={`px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${chartConfig.type === 'line' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-neutral-100 text-neutral-500'}`}
                      >
                        Line Chart
                      </button>
                      <button 
                        onClick={() => setChartConfig(prev => ({ ...prev, type: 'bar' }))}
                        className={`px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${chartConfig.type === 'bar' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-neutral-100 text-neutral-500'}`}
                      >
                        Bar Chart
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-2">X-Axis (Label)</label>
                      <select 
                        value={chartConfig.xCol} 
                        onChange={(e) => setChartConfig(prev => ({ ...prev, xCol: parseInt(e.target.value) }))}
                        className="w-full h-8 bg-neutral-50 border border-neutral-200 rounded px-2 text-[10px] font-bold text-neutral-700 outline-none focus:border-blue-500/50"
                      >
                        {Array.from({ length: cols }).map((_, i) => (
                          <option key={i} value={i}>Column {letters[i] || i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-2">Y-Axis (Values - Select Multiple)</label>
                      <div className="max-h-32 overflow-y-auto border border-neutral-200 rounded-lg bg-neutral-50 p-1 space-y-1">
                        {Array.from({ length: cols }).map((_, i) => (
                          <div key={i} className="flex flex-col gap-1 p-1 bg-white border border-neutral-100 rounded">
                            <button
                              onClick={() => toggleYCol(i)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-[10px] font-bold transition-all ${chartConfig.yCols.includes(i) ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}`}
                            >
                              <span>{letters[i] || i + 1} {numericCols.includes(i) ? '🔢' : '🔤'}</span>
                              {chartConfig.yCols.includes(i) && <Plus className="w-3 h-3 rotate-45" />}
                            </button>
                            
                            {chartConfig.yCols.includes(i) && (
                              <div className="flex items-center gap-1.5 px-2 py-1 border-t border-neutral-50 mt-0.5">
                                <div className="text-[9px] text-neutral-400 font-bold uppercase">Color</div>
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                  {COLORS.map(color => (
                                    <button
                                      key={color}
                                      onClick={() => setSeriesColor(i, color)}
                                      className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${chartConfig.seriesColors[i] === color ? 'border-neutral-300 scale-110 shadow-sm' : 'border-transparent'}`}
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-neutral-100 pt-3">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-2">Scientific Insights</label>
                    <div className="space-y-2">
                      <button 
                        onClick={() => setChartConfig(prev => ({ ...prev, showTrendLine: !prev.showTrendLine }))}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${chartConfig.showTrendLine ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-neutral-100 text-neutral-500'}`}
                      >
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Show Trend Line (Regression)</span>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${chartConfig.showTrendLine ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-neutral-200'}`} />
                      </button>

                      <button 
                        onClick={() => setChartConfig(prev => ({ ...prev, showStatistics: !prev.showStatistics }))}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${chartConfig.showStatistics ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-neutral-100 text-neutral-500'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" />
                          <span>Show Statistics (Avg/Stdev)</span>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${chartConfig.showStatistics ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-neutral-200'}`} />
                      </button>
                    </div>
                  </div>

                  {chartConfig.yCols.length === 0 && (
                    <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-blue-600 mt-0.5">ℹ️</div>
                      <p className="text-[10px] text-blue-700 leading-tight">
                        Select one or more columns to plot as series.
                      </p>
                    </div>
                  )}

                  {chartConfig.yCols.some(i => !numericCols.includes(i)) && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-amber-600 mt-0.5">⚠️</div>
                      <p className="text-[10px] text-amber-700 leading-tight">
                        Generic text detected in some selected columns. Only numeric series will be visualized.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={forceSync}
                      className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 border border-neutral-200"
                    >
                      Refresh
                    </button>
                    <button 
                      onClick={createChart}
                      className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Generate Chart
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative ml-1" ref={settingsRef}>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowSettings(s => !s); setShowFontMenu(false); }}
              className={`p-1.5 rounded transition-colors ${showSettings ? 'bg-neutral-200 text-neutral-900' : 'hover:bg-neutral-200 text-neutral-700'}`}
              title="Table Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            {showSettings && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-neutral-200 rounded-lg shadow-xl z-[10000] py-1 animate-in fade-in zoom-in-95 duration-100">
                <p className="px-3 py-1 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Columns</p>
                <button onMouseDown={(e) => tableOp(e, 'addColBefore')} className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Add Column Before</button>
                <button onMouseDown={(e) => tableOp(e, 'addColAfter')} className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Add Column After</button>
                <button onMouseDown={(e) => tableOp(e, 'deleteCol')} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">Delete Column</button>
                <div className="border-t border-neutral-100 my-1" />
                <p className="px-3 py-1 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Rows</p>
                <button onMouseDown={(e) => tableOp(e, 'addRowAfter')} className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Add Row After</button>
                <button onMouseDown={(e) => tableOp(e, 'deleteRow')} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">Delete Row</button>
              </div>
            )}
          </div>
        </div>

        {/* STATS PANEL */}
        {showStatsPanel && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
            {columnStats.length === 0 ? (
              <p className="text-[10px] text-blue-400">No numeric columns detected.</p>
            ) : columnStats.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-blue-100 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-blue-600 uppercase">{s.header}</span>
                <span className="text-[10px] text-neutral-500">n={s.n}</span>
                <span className="text-[10px] text-neutral-600">min <b>{s.min.toFixed(2)}</b></span>
                <span className="text-[10px] text-neutral-600">max <b>{s.max.toFixed(2)}</b></span>
                <span className="text-[10px] text-neutral-600">mean <b>{s.mean.toFixed(2)}</b></span>
                <span className="text-[10px] text-neutral-600">σ <b>{s.stdev.toFixed(2)}</b></span>
              </div>
            ))}
          </div>
        )}

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
        <div className="overflow-x-auto custom-scrollbar rounded-b-xl">
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
              onClick={(e) => addRows(e)}
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

      {/* EXPAND MODAL */}
      {isExpanded && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 shrink-0">
              <span className="text-sm font-bold text-neutral-800">Table — Expanded View</span>
              <div className="flex items-center gap-2">
                <button onMouseDown={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); setIsExpanded(false); }} className="p-1.5 hover:bg-neutral-100 text-neutral-500 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5 min-h-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {Array.from({ length: cols }).map((_, ci) => (
                      <th key={ci} className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        {node.childCount > 0 ? node.child(0).child(ci)?.textContent?.trim() || letters[ci] : letters[ci]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(0, node.childCount - 1) }).map((_, ri) => (
                    <tr key={ri} className="even:bg-neutral-50">
                      {Array.from({ length: cols }).map((_, ci) => (
                        <td key={ci} className="px-4 py-2.5 border border-neutral-200 text-neutral-700">
                          {node.child(ri + 1)?.child(ci)?.textContent?.trim() || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
  name: 'table',
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-table-id') || element.getAttribute('data-id'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.id) return {}
          return {
            'data-table-id': attributes.id,
            'data-id': attributes.id, // Keep both for safety
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpreadsheetTableComponent)
  },
})
