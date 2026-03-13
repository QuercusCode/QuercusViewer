import React, { useState, useMemo, useRef } from 'react'
import html2canvas from 'html2canvas'
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Trash2, BarChart2, TrendingUp, Palette, X, Download } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

const InlineChartComponent = ({ node, updateAttributes, deleteNode }: any) => {
  const { data, type, title, xAxis, yAxes, customColors, showTrendLine, showStatistics } = node.attrs
  const [showColorEditor, setShowColorEditor] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const isDark = document.documentElement.classList.contains('dark')
  const textColor = isDark ? '#a3a3a3' : '#525252'
  const gridColor = isDark ? '#262626' : '#e5e5e5'

  // Backwards compatibility for single yAxis
  const activeYAxes = yAxes && yAxes.length > 0 ? yAxes : (node.attrs.yAxis ? [node.attrs.yAxis] : [])
  const getSeriesColor = (index: number) => {
    if (customColors && customColors[index]) return customColors[index];
    return COLORS[index % COLORS.length];
  };

  const setSeriesColor = (index: number, color: string) => {
    const newColors = [...(customColors || [])];
    // Fill gaps if any
    while (newColors.length <= index) {
      newColors.push(COLORS[newColors.length % COLORS.length]);
    }
    newColors[index] = color;
    updateAttributes({ customColors: newColors });
  };

  // --- Scientific Calculations ---
  
  // Linear Regression: y = mx + b
  const getRegressionLine = (seriesName: string) => {
    const points = data
      .map((d: any, i: number) => ({ x: i, y: d[seriesName] }))
      .filter((p: any) => typeof p.y === 'number');
    
    if (points.length < 2) return null;

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate points for the trend line
    return data.map((_: any, i: number) => ({
      [`${seriesName}_trend`]: slope * i + intercept
    }));
  };

  // Statistics: Mean & Stdev
  const getSeriesStats = (seriesName: string) => {
    const vals = data
      .map((d: any) => d[seriesName])
      .filter((v: any) => typeof v === 'number');
    
    if (vals.length === 0) return null;

    const mean = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    return { mean };
  };

  // Augment data with trend lines if needed
  const augmentedData = useMemo(() => {
    if (!showTrendLine || !data) return data;
    
    let result = [...data];
    activeYAxes.forEach((y: string) => {
      const trend = getRegressionLine(y);
      if (trend) {
        result = result.map((d: any, i: number) => ({
          ...d,
          ...trend[i]
        }));
      }
    });
    return result;
  }, [data, activeYAxes, showTrendLine]);

  return (
    <NodeViewWrapper className="inline-chart-wrapper my-8 group relative">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-xl p-6 transition-all group-hover:border-blue-500/30">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${type === 'bar' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {type === 'bar' ? <BarChart2 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{title || 'Data Visualization'}</h3>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                {activeYAxes.length > 1 ? `${activeYAxes.length} series vs ${xAxis}` : `${activeYAxes[0]} vs ${xAxis}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button 
                onClick={() => setShowColorEditor(!showColorEditor)}
                className={`p-1.5 rounded-lg transition-all ${showColorEditor ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white'}`}
                title="Edit Colors"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {showColorEditor && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-main)]">
                    <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-tight">Edit Colors</span>
                    <button onClick={() => setShowColorEditor(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-4 max-h-48 overflow-y-auto no-scrollbar">
                    {activeYAxes.map((y: string, index: number) => (
                      <div key={y} className="flex flex-col gap-1.5">
                        <div className="text-[9px] font-bold text-[var(--text-muted)] truncate">{y}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setSeriesColor(index, color)}
                              className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${getSeriesColor(index) === color ? 'border-[var(--text-primary)] scale-110 shadow-sm' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => updateAttributes({ type: type === 'bar' ? 'line' : 'bar' })}
              className="px-2 py-1 bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px] font-bold rounded border border-[var(--border-main)] transition-colors h-7"
            >
              {type === 'bar' ? 'Line' : 'Bar'}
            </button>
            <button 
              onClick={deleteNode}
              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
              title="Delete Chart"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Scientific Controls Overlay */}
        <div className="flex items-center gap-3 mb-4 px-2">
          <button
            onClick={async () => {
              if (!chartRef.current) {
                console.error('Chart reference not found');
                return;
              }
              
              setIsExporting(true);
              try {
                // Wait a tiny moment for any pending Recharts animations
                await new Promise(resolve => setTimeout(resolve, 500));

                const canvas = await html2canvas(chartRef.current, {
                  scale: 2, // 2x is usually enough and more stable than 3x
                  backgroundColor: isDark ? '#171717' : '#ffffff',
                  useCORS: true,
                  logging: true,
                  onclone: (clonedDoc) => {
                    // Critical: Find the chart area in the cloned document and force dimensions
                    // html2canvas sometimes renders 100% width elements as 0px in its internal frame
                    const element = clonedDoc.querySelector('[ref="chartRef"]') || clonedDoc.querySelector('.h-72');
                    if (element instanceof HTMLElement) {
                      element.style.width = '800px'; 
                      element.style.height = '400px';
                      element.style.padding = '20px';
                      // Force background/border to safe colors to avoid oklch issues
                      element.style.backgroundColor = isDark ? '#171717' : '#ffffff';
                      element.style.borderColor = isDark ? '#262626' : '#e5e5e5';
                    }

                    // --- Fix for html2canvas oklch crash ---
                    // Modern CSS like Tailwind 4 uses oklch which html2canvas cannot parse.
                    // We scan all elements and replace any computed oklch values with HEX fallbacks.
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach((el) => {
                      if (!(el instanceof HTMLElement)) return;
                      const style = window.getComputedStyle(el);
                      
                      // Check most common properties that might cause crashes
                      ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].forEach(prop => {
                        const val = (style as any)[prop];
                        if (val && typeof val === 'string' && val.includes('oklch')) {
                          // If it's a oklch color, replace it with a standard HEX/RGB fallback
                          // Since we can't easily convert oklch in JS without a library,
                          // we use the theme's default textColor/gridColor as safe fallbacks.
                          if (prop === 'color' || prop === 'fill') {
                            el.style.setProperty(prop, textColor, 'important');
                          } else if (prop === 'backgroundColor') {
                            el.style.setProperty(prop, isDark ? '#171717' : '#ffffff', 'important');
                          } else {
                            el.style.setProperty(prop, gridColor, 'important');
                          }
                        }
                      });
                    });
                    // ----------------------------------------
                    
                    // Recharts specific: Ensure SVGs have proper dimensions
                    const svgs = clonedDoc.querySelectorAll('svg');
                    svgs.forEach(svg => {
                      svg.setAttribute('width', '800');
                      svg.setAttribute('height', '400');
                    });
                  }
                });

                if (!canvas) throw new Error('Canvas generation returned null');

                const dataUrl = canvas.toDataURL('image/png', 1.0);
                if (!dataUrl || dataUrl === 'data:,') throw new Error('Invalid data URL generated');

                const link = document.createElement('a');
                const safeTitle = (title || 'Chart').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                link.download = `${safeTitle}_export.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch (err: any) {
                console.error('High-Res Export Error:', err);
                const errorMsg = err?.message || 'Unknown error';
                alert(`Export failed: ${errorMsg}\n\nTip: Make sure the chart is fully visible on screen.`);
              } finally {
                setIsExporting(false);
              }
            }}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20 transition-all disabled:opacity-50"
          >
            {isExporting ? <span className="animate-spin text-xs">⌛</span> : <Download className="w-3.5 h-3.5" />}
            {isExporting ? 'Capturing High-Res...' : 'Download PNG (Publication Ready)'}
          </button>
        </div>

        {/* Chart Area */}
        <div ref={chartRef} className="h-72 w-full flex items-center justify-center p-2 bg-transparent">
          {data && data.length > 0 && activeYAxes.length > 0 && data.some((d: any) => activeYAxes.some((y: string) => typeof d[y] === 'number')) ? (
            <ResponsiveContainer width="100%" height="100%">
              {type === 'bar' ? (
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis 
                    dataKey={xAxis} 
                    stroke={textColor} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: textColor }}
                  />
                  <YAxis 
                    stroke={textColor} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: textColor }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#171717' : '#ffffff',
                      border: `1px solid ${gridColor}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: isDark ? '#ffffff' : '#000000'
                    }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  />
                  {activeYAxes.length > 1 && (
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', paddingTop: '0px', paddingBottom: '20px' }}
                    />
                  )}
                  {activeYAxes.map((y: string, index: number) => (
                    <Bar 
                      key={y} 
                      dataKey={y} 
                      fill={getSeriesColor(index)} 
                      radius={[4, 4, 0, 0]} 
                      name={y}
                    />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={augmentedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis 
                    dataKey={xAxis} 
                    stroke={textColor} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: textColor }}
                  />
                  <YAxis 
                    stroke={textColor} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: textColor }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#171717' : '#ffffff',
                      border: `1px solid ${gridColor}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: isDark ? '#ffffff' : '#000000'
                    }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  />
                  {activeYAxes.length > 1 && (
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', paddingTop: '0px', paddingBottom: '20px' }}
                    />
                  )}
                  {activeYAxes.map((y: string, index: number) => (
                    <React.Fragment key={y}>
                      <Line 
                        type="monotone" 
                        dataKey={y} 
                        stroke={getSeriesColor(index)} 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: getSeriesColor(index), strokeWidth: 2, stroke: isDark ? '#171717' : '#ffffff' }}
                        activeDot={{ r: 6 }}
                        name={y}
                      />
                      {showTrendLine && (
                        <Line
                          type="monotone"
                          dataKey={`${y}_trend`}
                          stroke={getSeriesColor(index)}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          activeDot={false}
                          name={`${y} Trend`}
                        />
                      )}
                      {showStatistics && getSeriesStats(y) && (
                        <ReferenceLine 
                          y={getSeriesStats(y)!.mean} 
                          stroke={getSeriesColor(index)} 
                          strokeDasharray="3 3"
                          label={{ 
                            value: `Avg`, 
                            fill: getSeriesColor(index), 
                            fontSize: 8,
                            position: 'insideBottomRight'
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-[var(--input-bg)] rounded-xl border border-dashed border-[var(--border-main)] w-full">
              <BarChart2 className="w-8 h-8 text-[var(--text-muted)] mb-3 opacity-20" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">No plottable data</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-[200px]">
                Ensure at least one numeric column is selected as a Y-axis in your chart settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const InlineChart = Node.create({
  name: 'inlineChart',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      data: {
        default: [],
        parseHTML: element => {
          const raw = element.getAttribute('data-chart-data')
          try { return raw ? JSON.parse(raw) : [] } catch { return [] }
        },
        renderHTML: attributes => ({
          'data-chart-data': JSON.stringify(attributes.data),
        }),
      },
      type: {
        default: 'line', // 'line' | 'bar'
        parseHTML: element => element.getAttribute('data-chart-type') || 'line',
        renderHTML: attributes => ({
          'data-chart-type': attributes.type,
        }),
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-chart-title') || '',
        renderHTML: attributes => ({
          'data-chart-title': attributes.title,
        }),
      },
      xAxis: {
        default: '',
        parseHTML: element => element.getAttribute('data-chart-xaxis') || '',
        renderHTML: attributes => ({
          'data-chart-xaxis': attributes.xAxis,
        }),
      },
      yAxis: {
        default: '',
        parseHTML: element => element.getAttribute('data-chart-yaxis') || '',
        renderHTML: attributes => ({
          'data-chart-yaxis': attributes.yAxis,
        }),
      },
      yAxes: {
        default: [],
        parseHTML: element => {
          const raw = element.getAttribute('data-chart-yaxes')
          try { return raw ? JSON.parse(raw) : [] } catch { return [] }
        },
        renderHTML: attributes => ({
          'data-chart-yaxes': JSON.stringify(attributes.yAxes),
        }),
      },
      customColors: {
        default: [],
        parseHTML: element => {
          const raw = element.getAttribute('data-chart-colors')
          try { return raw ? JSON.parse(raw) : [] } catch { return [] }
        },
        renderHTML: attributes => ({
          'data-chart-colors': JSON.stringify(attributes.customColors),
        }),
      },
      tableId: {
        default: '',
        parseHTML: element => element.getAttribute('data-table-id') || '',
        renderHTML: attributes => ({
          'data-table-id': attributes.tableId,
        }),
      },
      showTrendLine: {
        default: false,
        parseHTML: element => element.getAttribute('data-show-trendline') === 'true',
        renderHTML: attributes => ({
          'data-show-trendline': attributes.showTrendLine ? 'true' : 'false',
        }),
      },
      showStatistics: {
        default: false,
        parseHTML: element => element.getAttribute('data-show-statistics') === 'true',
        renderHTML: attributes => ({
          'data-show-statistics': attributes.showStatistics ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="inline-chart"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-chart' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineChartComponent)
  },
})
