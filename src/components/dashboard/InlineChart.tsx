import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { Trash2, BarChart2, TrendingUp } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

const InlineChartComponent = ({ node, updateAttributes, deleteNode }: any) => {
  const { data, type, title, xAxis, yAxes, customColors } = node.attrs

  const isDark = document.documentElement.classList.contains('dark')
  const textColor = isDark ? '#a3a3a3' : '#525252'
  const gridColor = isDark ? '#262626' : '#e5e5e5'

  // Backwards compatibility for single yAxis
  const activeYAxes = yAxes && yAxes.length > 0 ? yAxes : (node.attrs.yAxis ? [node.attrs.yAxis] : [])
  const getSeriesColor = (index: number) => {
    if (customColors && customColors[index]) return customColors[index];
    return COLORS[index % COLORS.length];
  };

  return (
    <NodeViewWrapper className="inline-chart-wrapper my-8 group relative">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-xl p-6 transition-all group-hover:border-blue-500/30">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
            <button 
              onClick={() => updateAttributes({ type: type === 'bar' ? 'line' : 'bar' })}
              className="px-2 py-1 bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px] font-bold rounded border border-[var(--border-main)] transition-colors"
            >
              Switch to {type === 'bar' ? 'Line' : 'Bar'}
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

        {/* Chart Area */}
        <div className="h-72 w-full flex items-center justify-center">
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
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Line 
                      key={y}
                      type="monotone" 
                      dataKey={y} 
                      stroke={getSeriesColor(index)} 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: getSeriesColor(index), strokeWidth: 2, stroke: isDark ? '#171717' : '#ffffff' }}
                      activeDot={{ r: 6 }}
                      name={y}
                    />
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
      },
      type: {
        default: 'line', // 'line' | 'bar'
      },
      title: {
        default: '',
      },
      xAxis: {
        default: '',
      },
      yAxis: {
        default: '',
      },
      yAxes: {
        default: [],
      },
      customColors: {
        default: [],
      },
      tableId: {
        default: '',
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
