import React, { useState, useMemo, useRef } from 'react'
import html2canvas from 'html2canvas'
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ScatterChart, Scatter, ZAxis
} from 'recharts'
import { Trash2, BarChart2, TrendingUp, Palette, X, Download, Zap } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

const InlineChartComponent = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
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
  

  // Statistics: Mean & Stdev
  const getSeriesStats = (seriesName: string) => {
    const vals = data
      .map((d: any) => Number(d[seriesName]))
      .filter((v: number) => !isNaN(v));
    
    if (vals.length === 0) return null;

    const mean = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    return { mean };
  };

  // Detect if X-axis column is primarily numeric
  const isXNumeric = useMemo(() => {
    if (!data || data.length === 0) return false;
    // Sample a few values to see if they are numbers
    const samples = data.slice(0, 5).map((d: any) => d[xAxis]);
    return samples.every((v: any) => !isNaN(parseFloat(v)) && isFinite(v));
  }, [data, xAxis]);

  // Unique X-axis domain (for categorical alignment)
  const xAxisDomain = useMemo(() => {
    if (!data || isXNumeric) return undefined;
    const labels = data.map((d: any) => String(d[xAxis]));
    return Array.from(new Set(labels)) as any[];
  }, [data, xAxis, isXNumeric]);

  // Unified augmented data (Sanitization + Trend Lines + Index Mapping)
  const augmentedData = useMemo(() => {
    if (!data) return [];
    
    // 1. Initial sanitization: ensure numeric Y values and potentially numeric X values
    let result = data.map((d: any) => {
      const sanitized: any = { ...d };
      activeYAxes.forEach((y: string) => {
        sanitized[y] = parseFloat(d[y]);
      });

      if (type === 'scatter') {
        if (isXNumeric) {
          sanitized[xAxis] = parseFloat(d[xAxis]);
        } else if (xAxisDomain) {
          // V12: Map text label to its numeric index for perfect alignment
          const label = String(d[xAxis]);
          sanitized[xAxis] = xAxisDomain.indexOf(label);
        }
      }
      return sanitized;
    });

    // 2. Add Trend Lines if needed (using the already sanitized/mapped result)
    if (showTrendLine) {
      activeYAxes.forEach((y: string) => {
        // Linear Regression: y = mx + b
        const points = result
          .map((d: any) => ({ x: Number(d[xAxis]), y: Number(d[y]) }))
          .filter((p: any) => !isNaN(p.x) && !isNaN(p.y));
        
        if (points.length >= 2) {
          const n = points.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
          for (const p of points) {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
          }
          const denom = n * sumX2 - sumX * sumX;
          if (Math.abs(denom) >= 0.0000001) {
            const slope = (n * sumXY - sumX * sumY) / denom;
            const intercept = (sumY - slope * sumX) / n;
            result = result.map((d: any) => ({
              ...d,
              [`${y}_trend`]: slope * Number(d[xAxis]) + intercept
            }));
          }
        }
      });
    }

    return result;
  }, [data, activeYAxes, showTrendLine, type, xAxis, isXNumeric, xAxisDomain]);

  return (
    <NodeViewWrapper ref={chartRef} className="inline-chart-wrapper my-8 group relative">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-xl p-8 transition-all group-hover:border-blue-500/30">
        
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg capture-hide ${type === 'bar' ? 'bg-emerald-500/10 text-emerald-400' : type === 'scatter' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {type === 'bar' ? <BarChart2 className="w-4 h-4" /> : type === 'scatter' ? <Zap className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {title || (type === 'scatter' ? 'Correlation Analysis' : 'Comparison Chart')}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mt-1">
                {xAxis} vs {activeYAxes.join(' & ')}
              </p>
            </div>
          </div>
          
          {/* Right: View Toggles & Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity capture-hide">
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
              onClick={() => {
                const types = ['bar', 'line', 'scatter'];
                const nextType = types[(types.indexOf(type) + 1) % types.length];
                updateAttributes({ type: nextType });
              }}
              className="px-2 py-1 bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px] font-bold rounded border border-[var(--border-main)] transition-colors h-7"
            >
              {type === 'bar' ? 'Line' : type === 'line' ? 'Scatter' : 'Bar'}
            </button>
            <button 
              onClick={() => deleteNode()}
              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
              title="Delete Chart"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Scientific Controls Overlay */}
        <div className="flex items-center gap-3 mb-6 px-2 capture-hide">
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!chartRef.current) return;
              
              setIsExporting(true);
              const originalStyle = chartRef.current.getAttribute('style') || '';
              
              try {
                // 1. LIVE RESIZE: Force the chart to 1000px off-screen in the actual DOM
                // This allows Recharts to recalculate the ResponsiveContainer BEFORE capture
                chartRef.current.style.position = 'fixed';
                chartRef.current.style.left = '-5000px';
                chartRef.current.style.top = '0';
                chartRef.current.style.width = '1000px';
                chartRef.current.style.zIndex = '-9999';
                chartRef.current.style.visibility = 'visible';
                chartRef.current.style.opacity = '1';

                // 2. WAIT FOR LAYOUT: Give Recharts 800ms to re-render SVG at 1000px
                await new Promise(resolve => setTimeout(resolve, 800));

                const elementToCapture = chartRef.current;
                
                // 3. CAPTURE WITH ONCLONE ISOLATION
                const canvas = await html2canvas(elementToCapture, {
                  scale: 2,
                  backgroundColor: isDark ? '#171717' : '#ffffff',
                  useCORS: true,
                  logging: false,
                  onclone: (clonedDoc) => {
                    // NUCLEAR STRIP: Remove modern color crashes
                    const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
                    styles.forEach(s => s.remove());

                    const safeStyles = clonedDoc.createElement('style');
                    safeStyles.innerHTML = `
                      * { box-sizing: border-box; }
                      .inline-chart-wrapper { 
                        width: 1000px !important; 
                        padding: 40px !important;
                        background: ${isDark ? '#171717' : '#ffffff'} !important;
                        display: block !important;
                        font-family: -apple-system, sans-serif !important;
                      }
                      .bg-\\[var\\(--bg-sidebar\\)\\] { 
                        background: ${isDark ? '#171717' : '#ffffff'} !important;
                        border-radius: 24px !important;
                        padding: 48px !important;
                        border: 1px solid ${isDark ? '#262626' : '#e5e5e5'} !important;
                        width: 100% !important;
                      }
                      .text-\\[var\\(--text-primary\\)\\] { color: ${isDark ? '#f5f5f5' : '#171717'} !important; }
                      .text-\\[var\\(--text-muted\\)\\] { color: #888888 !important; }
                      .h-72 { width: 100% !important; height: 400px !important; margin-top: 32px !important; }
                      .text-xl { font-size: 32px !important; font-weight: 800 !important; margin: 0 !important; }
                      .text-xs { font-size: 14px !important; margin-top: 6px !important; }
                      .flex { display: flex !important; }
                      .items-center { align-items: center !important; }
                      .items-start { align-items: flex-start !important; }
                      .justify-between { justify-content: space-between !important; }
                      .mb-6 { margin-bottom: 24px !important; }
                      .gap-3 { gap: 12px !important; }
                      .capture-hide { display: none !important; }
                      .recharts-responsive-container { width: 100% !important; height: 100% !important; }
                      svg { width: 100% !important; height: 100% !important; display: block; }
                      .recharts-text { fill: #888888 !important; font-size: 12px !important; font-weight: 600 !important; }
                      .recharts-legend-item-text { fill: #888888 !important; font-weight: 600 !important; }
                      .recharts-cartesian-grid-line { stroke: ${isDark ? '#262626' : '#e5e5e5'} !important; }
                    `;
                    clonedDoc.head.appendChild(safeStyles);

                    // SCRUB INLINE OKLAB COLORS
                    clonedDoc.querySelectorAll('*').forEach(el => {
                      if (el instanceof HTMLElement) {
                        const s = el.getAttribute('style') || '';
                        if (s.includes('okl')) {
                          el.style.color = '';
                          el.style.backgroundColor = '';
                          el.style.borderColor = '';
                        }
                      }
                    });
                  }
                });

                const link = document.createElement('a');
                link.download = `${title.replace(/\s+/g, '_') || 'chart'}_export.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
              } catch (err: any) {
                console.error('Export Error:', err);
                alert(`Export failed: ${err.message || 'Unknown failure'}`);
              } finally {
                // 4. RESTORE ORIGINAL STATE
                if (chartRef.current) {
                  chartRef.current.setAttribute('style', originalStyle);
                }
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
        <div className="h-72 w-full flex items-center justify-center p-2 bg-transparent">
          {data && data.length > 0 && activeYAxes.length > 0 && data.some((d: any) => activeYAxes.some((y: string) => !isNaN(parseFloat(d[y])))) ? (
            isExporting ? (
              // --- V7 DEFINITIVE FIX: Fixed Pixel Render Bypass ---
              // During export, we bypass ResponsiveContainer and force 1000px width.
              // This ensures Recharts calculates all SVG paths at the target resolution instantly.
              type === 'bar' ? (
                <BarChart width={1000} height={400} data={data} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey={xAxis} stroke={textColor} fontSize={14} tickLine={false} axisLine={false} tick={{ fill: textColor }} interval={0} minTickGap={0} />
                  <YAxis stroke={textColor} fontSize={14} tickLine={false} axisLine={false} tick={{ fill: textColor }} />
                  {activeYAxes.length > 1 && (
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '14px', paddingBottom: '30px' }} />
                  )}
                  {activeYAxes.map((y: string, index: number) => (
                    <Bar key={y} dataKey={y} fill={getSeriesColor(index)} radius={[6, 6, 0, 0]} name={y} isAnimationActive={false} />
                  ))}
                </BarChart>
              ) : type === 'scatter' ? (
                <ScatterChart width={1000} height={400} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis 
                    type="number"
                    dataKey={xAxis} 
                    name={xAxis} 
                    stroke={textColor} 
                    fontSize={14} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: textColor }} 
                    domain={isXNumeric ? ['auto', 'auto'] : [-0.5, (xAxisDomain?.length || 1) - 0.5]} 
                    ticks={isXNumeric ? undefined : xAxisDomain?.map((_, i) => i)}
                    interval={0}
                    minTickGap={0}
                    tickFormatter={(val) => isXNumeric ? val : (xAxisDomain?.[Math.round(val)] || '')}
                  />
                  <YAxis type="number" stroke={textColor} fontSize={14} tickLine={false} axisLine={false} tick={{ fill: textColor }} domain={['auto', 'auto']} />
                  <ZAxis type="number" range={[64, 64]} />
                  {activeYAxes.length > 1 && (
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '14px', paddingBottom: '30px' }} />
                  )}
                  {activeYAxes.map((y: string, index: number) => (
                    <React.Fragment key={y}>
                      <Scatter 
                        key={y} 
                        name={y} 
                        data={augmentedData} 
                        dataKey={y}
                        fill={getSeriesColor(index)} 
                        isAnimationActive={false} 
                      />
                      {showTrendLine && (
                        <Scatter
                          key={`${y}_trend`}
                          name={`${y} Trend`}
                          data={augmentedData}
                          dataKey={`${y}_trend`}
                          fill={getSeriesColor(index)}
                          isAnimationActive={false}
                          line={{ stroke: getSeriesColor(index), strokeWidth: 2, strokeDasharray: '5 5' }}
                          shape={() => null} 
                        />
                      )}
                    </React.Fragment>
                  ))}
                </ScatterChart>
              ) : (
                <LineChart width={1000} height={400} data={augmentedData} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey={xAxis} stroke={textColor} fontSize={14} tickLine={false} axisLine={false} tick={{ fill: textColor }} interval={0} minTickGap={0} />
                  <YAxis stroke={textColor} fontSize={14} tickLine={false} axisLine={false} tick={{ fill: textColor }} />
                  {activeYAxes.length > 1 && (
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '14px', paddingBottom: '30px' }} />
                  )}
                  {activeYAxes.map((y: string, index: number) => (
                    <React.Fragment key={y}>
                      <Line 
                        type="monotone" 
                        dataKey={y} 
                        stroke={getSeriesColor(index)} 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: getSeriesColor(index), strokeWidth: 3, stroke: isDark ? '#171717' : '#ffffff' }}
                        name={y} 
                        isAnimationActive={false}
                      />
                      {showTrendLine && (
                        <Line 
                          type="monotone" 
                          dataKey={`${y}_trend`} 
                          stroke={getSeriesColor(index)} 
                          strokeWidth={3} 
                          strokeDasharray="6 6" 
                          dot={false} 
                          activeDot={false} 
                          name={`${y} Trend`} 
                          isAnimationActive={false}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </LineChart>
              )
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {type === 'bar' ? (
                  <BarChart data={data} margin={{ top: 10, right: 10, left: 30, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis 
                      dataKey={xAxis} 
                      stroke={textColor} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: textColor }}
                      interval={0}
                      minTickGap={0}
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
                ) : type === 'scatter' ? (
                  <ScatterChart margin={{ top: 10, right: 10, left: 30, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                      type="number"
                      dataKey={xAxis} 
                      name={xAxis}
                      stroke={textColor} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: textColor }}
                      domain={isXNumeric ? ['auto', 'auto'] : [-0.5, (xAxisDomain?.length || 1) - 0.5]}
                      ticks={isXNumeric ? undefined : xAxisDomain?.map((_, i) => i)}
                      interval={0}
                      minTickGap={0}
                      tickFormatter={(val) => isXNumeric ? val : (xAxisDomain?.[Math.round(val)] || '')}
                    />
                    <YAxis 
                      type="number"
                      stroke={textColor} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: textColor }}
                      domain={['auto', 'auto']}
                    />
                    <ZAxis type="number" range={[40, 40]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
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
                        <Scatter 
                          key={y} 
                          name={y} 
                          data={augmentedData}
                          dataKey={y}
                          fill={getSeriesColor(index)} 
                        />
                        {showTrendLine && (
                          <Scatter
                            key={`${y}_trend`}
                            name={`${y} Trend`}
                            data={augmentedData}
                            dataKey={`${y}_trend`}
                            fill={getSeriesColor(index)}
                            line={{ stroke: getSeriesColor(index), strokeWidth: 2, strokeDasharray: '5 5' }}
                            shape={() => null}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </ScatterChart>
                ) : (
                  <LineChart data={augmentedData} margin={{ top: 10, right: 10, left: 30, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis 
                      dataKey={xAxis} 
                      stroke={textColor} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: textColor }}
                      interval={0}
                      minTickGap={0}
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
            )
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
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-chart-data')
          try { return raw ? JSON.parse(raw) : [] } catch { return [] }
        },
        renderHTML: (attributes: Record<string, any>) => ({
          'data-chart-data': JSON.stringify(attributes.data),
        }),
      },
      type: {
        default: 'line', // 'line' | 'bar'
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chart-type') || 'line',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-chart-type': attributes.type,
        }),
      },
      title: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chart-title') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-chart-title': attributes.title,
        }),
      },
      xAxis: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chart-xaxis') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-chart-xaxis': attributes.xAxis,
        }),
      },
      yAxis: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chart-yaxis') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-chart-yaxis': attributes.yAxis,
        }),
      },
      yAxes: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-chart-yaxes')
          try { return raw ? JSON.parse(raw) : [] } catch { return [] }
        },
        renderHTML: (attributes: Record<string, any>) => ({
          'data-chart-yaxes': JSON.stringify(attributes.yAxes),
        }),
      },
      customColors: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-chart-colors')
          try { return raw ? JSON.parse(raw) : [] } catch { return [] }
        },
        renderHTML: (attributes: Record<string, any>) => ({
          'data-chart-colors': JSON.stringify(attributes.customColors),
        }),
      },
      tableId: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-table-id') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-table-id': attributes.tableId,
        }),
      },
      showTrendLine: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-show-trendline') === 'true',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-show-trendline': attributes.showTrendLine ? 'true' : 'false',
        }),
      },
      showStatistics: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-show-statistics') === 'true',
        renderHTML: (attributes: Record<string, any>) => ({
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

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-chart' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineChartComponent)
  },

  addStorage() {
    return {
      markdown: {
        serialize: (state: any, node: any) => {
          const payload = JSON.stringify({
            data: node.attrs.data,
            type: node.attrs.type,
            title: node.attrs.title,
            xAxis: node.attrs.xAxis,
            yAxes: node.attrs.yAxes,
            customColors: node.attrs.customColors,
            tableId: node.attrs.tableId,
            showTrendLine: node.attrs.showTrendLine,
            showStatistics: node.attrs.showStatistics,
          });
          const base64 = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(payload))) : Buffer.from(payload).toString('base64');
          state.write(`\n\`\`\`inline-chart\n${base64}\n\`\`\`\n`);
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
                if (token.info === 'inline-chart') {
                  try {
                    const base64 = token.content.trim();
                    const jsonStr = typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(base64))) : Buffer.from(base64, 'base64').toString('utf8');
                    const attrs = JSON.parse(jsonStr);
                    const escapeHtml = (str: string) => String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                    
                    return `<div data-type="inline-chart" data-chart-data="${escapeHtml(JSON.stringify(attrs.data || []))}" data-chart-type="${escapeHtml(attrs.type || 'line')}" data-chart-title="${escapeHtml(attrs.title || '')}" data-chart-xaxis="${escapeHtml(attrs.xAxis || '')}" data-chart-yaxes="${escapeHtml(JSON.stringify(attrs.yAxes || []))}" data-chart-colors="${escapeHtml(JSON.stringify(attrs.customColors || []))}" data-table-id="${escapeHtml(attrs.tableId || '')}" data-show-trendline="${attrs.showTrendLine ? 'true' : 'false'}" data-show-statistics="${attrs.showStatistics ? 'true' : 'false'}"></div>`;
                  } catch (e) {
                    console.error('Failed to parse inline-chart:', e);
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
})
