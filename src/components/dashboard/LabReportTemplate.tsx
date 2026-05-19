import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Structure } from '../../lib/structuresService';
import { useTranslation } from '../../lib/i18n';

interface LabReportTemplateProps {
  title: string;
  content: string;
  date: string;
  author: string;
  id: string;
  allStructures?: Structure[];
}

/**
 * Helper for calculator fields in PDF
 */
const PdfCalcField = ({ label, value, unit, highlight }: { label: string, value: string, unit: string, highlight?: boolean }) => (
  <div style={{ marginBottom: '0.5rem' }}>
    <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>{label}</p>
    <p style={{ 
      margin: 0, 
      fontSize: '12px', 
      fontWeight: 'bold', 
      color: highlight ? '#2563eb' : '#1e293b',
      fontFamily: 'monospace',
      borderBottom: '1px solid #f1f5f9',
      paddingBottom: '2px'
    }}>
      {value || '-'} <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#94a3b8' }}>{unit}</span>
    </p>
  </div>
);

// --- Custom Block Renderers ---

const renderSketcher = (payload: string, key: any) => {
  try {
    const isBase64 = !payload.trim().startsWith('{');
    const jsonStr = isBase64 
      ? decodeURIComponent(escape(atob(payload.trim())))
      : payload.trim();
    const data = JSON.parse(jsonStr);
    const svgContent = data.svg;
    
    return (
      <div 
        key={key}
        className="my-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50"
        style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '1rem 0', padding: '1rem', border: '1px solid #f3f4f6', borderRadius: '0.75rem', backgroundColor: '#f9fafb' }}
        dangerouslySetInnerHTML={{ 
          __html: svgContent.replace('<svg', '<svg style="width:100%; height:auto; max-height:280px" preserveAspectRatio="xMidYMid meet"') 
        }}
      />
    );
  } catch (err) {
    console.error("PDF Sketcher Decode Error:", err);
    return <span key={key} style={{ color: '#ef4444', fontSize: '10px' }}>Error rendering structure</span>;
  }
};

const renderCalculator = (payload: string, key: any) => {
  try {
    const isBase64 = !payload.trim().startsWith('{');
    const jsonStr = isBase64 
      ? decodeURIComponent(escape(atob(payload.trim())))
      : payload.trim();
    const { type, values, units, targetField } = JSON.parse(jsonStr);
    
    const u = units || { 
      c1: 'mM', v1: 'mL', c2: 'mM', v2: 'mL', 
      c: 'mM', v: 'mL', mw: 'g/mol', m: 'mg' 
    };

    return (
      <div key={key} style={{ margin: '1.5rem 0', border: '1px solid #bfdbfe', borderRadius: '1rem', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ backgroundColor: '#eff6ff', padding: '0.5rem 1rem', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {type === 'dilution' ? 'Dilution (C1V1 = C2V2)' : 'Molarity Calculator'}
          </span>
          <div style={{ width: '16px', height: '16px', color: '#60a5fa' }}>🧪</div>
        </div>
        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {type === 'dilution' ? (
            <>
              <PdfCalcField label="Initial Conc (C1)" value={values.c1} unit={u.c1} highlight={targetField === 'c1'} />
              <PdfCalcField label="Initial Vol (V1)" value={values.v1} unit={u.v1} highlight={targetField === 'v1'} />
              <PdfCalcField label="Final Conc (C2)" value={values.c2} unit={u.c2} highlight={targetField === 'c2'} />
              <PdfCalcField label="Final Vol (V2)" value={values.v2} unit={u.v2} highlight={targetField === 'v2'} />
            </>
          ) : (
            <>
              <PdfCalcField label="Desired Conc" value={values.c} unit={u.c} highlight={targetField === 'c'} />
              <PdfCalcField label="Target Volume" value={values.v} unit={u.v} highlight={targetField === 'v'} />
              <PdfCalcField label="Mol. Weight" value={values.mw} unit={u.mw} highlight={targetField === 'mw'} />
              <PdfCalcField label="Required Mass" value={values.m} unit={u.m} highlight={targetField === 'm'} />
            </>
          )}
        </div>
      </div>
    );
  } catch (err) {
    console.error("PDF Calculator Decode Error:", err);
    return <span key={key} style={{ color: '#ef4444', fontSize: '10px' }}>Error rendering calculator</span>;
  }
};

const renderCodeCell = (payload: string, key: any) => {
  try {
    const isBase64 = !payload.trim().startsWith('{');
    const jsonStr = isBase64 
      ? decodeURIComponent(escape(atob(payload.trim())))
      : payload.trim();
    const { code, output } = JSON.parse(jsonStr);
    
    return (
      <div key={key} style={{ margin: '1.5rem 0', border: '1px solid #30363d', borderRadius: '0.75rem', overflow: 'hidden', backgroundColor: '#0d1117' }}>
        <div style={{ backgroundColor: '#161b22', padding: '0.4rem 0.75rem', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', color: '#3b82f6' }}>⌨️</div>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Python Execution</span>
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: '#0d1117' }}>
          <pre style={{ margin: 0, fontSize: '11px', color: '#e6edf3', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{code}</pre>
        </div>
        {output && (
          <div style={{ padding: '0.75rem', backgroundColor: '#00000050', borderTop: '1px solid #30363d' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '8px', fontWeight: 'bold', color: '#58a6ff', textTransform: 'uppercase' }}>Output</p>
            <pre style={{ margin: 0, fontSize: '11px', color: '#8b949e', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{output}</pre>
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error("PDF Code Cell Decode Error:", err);
    return <span key={key} style={{ color: '#ef4444', fontSize: '10px' }}>Error rendering code cell</span>;
  }
};

const renderImageWorkbench = (payload: string, key: any) => {
  try {
    const isBase64 = !payload.trim().startsWith('{');
    const jsonStr = isBase64 
      ? decodeURIComponent(escape(atob(payload.trim())))
      : payload.trim();
    const { src, annotations, calibration } = JSON.parse(jsonStr);
    
    if (!src) return null;

    return (
      <div key={key} style={{ margin: '2rem 0', position: 'relative', border: '1px solid #e2e8f0', borderRadius: '1rem', overflow: 'hidden' }}>
        <img src={src} style={{ width: '100%', display: 'block' }} alt="Workbench Analysis" />
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {annotations.map((anno: any) => {
            const p1 = anno.points[0];
            const p2 = anno.points[1];
            const color = anno.color || '#3b82f6';

            if (anno.type === 'measure') {
              return (
                <g key={anno.id}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth="0.5" />
                  <circle cx={p1.x} cy={p1.y} r="0.8" fill={color} />
                  <circle cx={p2.x} cy={p2.y} r="0.8" fill={color} />
                  <rect 
                    x={(p1.x + p2.x) / 2 - 5} 
                    y={(p1.y + p2.y) / 2 - 3} 
                    width="10" 
                    height="6" 
                    rx="1"
                    fill="rgba(0,0,0,0.7)" 
                  />
                  <text 
                    x={(p1.x + p2.x) / 2} 
                    y={(p1.y + p2.y) / 2 + 1} 
                    fill="#fff" 
                    fontSize="2" 
                    textAnchor="middle"
                    fontFamily="Arial"
                  >
                    {anno.result}
                  </text>
                </g>
              );
            } else if (anno.type === 'roi') {
              const rx = Math.min(p1.x, p2.x);
              const ry = Math.min(p1.y, p2.y);
              const rw = Math.abs(p1.x - p2.x);
              const rh = Math.abs(p1.y - p2.y);
              return (
                <g key={anno.id}>
                  <rect x={rx} y={ry} width={rw} height={rh} stroke={color} strokeWidth="0.5" fill="rgba(16, 185, 129, 0.1)" />
                  <rect x={rx} y={ry - 6} width="12" height="5" rx="1" fill="rgba(0,0,0,0.7)" />
                  <text x={rx + 1} y={ry - 2.5} fill="#10b981" fontSize="2" fontFamily="Arial">
                    Mean: {anno.result}
                  </text>
                </g>
              );
            }
            return null;
          })}
        </svg>
        
        {/* Scale Bar Indicator */}
        {calibration.ratio > 0 && (
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', color: '#fff', fontSize: '8px', fontFamily: 'Arial' }}>
            <div style={{ width: '20px', height: '1px', backgroundColor: '#fff' }} />
            <span>{calibration.um} µm calibrated</span>
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error("PDF Image Workbench Decode Error:", err);
    return <span key={key} style={{ color: '#ef4444', fontSize: '10px' }}>Error rendering analysis</span>;
  }
};

const renderResizableImage = (payload: string, key: any, forceBase64 = false) => {
  try {
    const isBase64 = forceBase64 || !payload.trim().startsWith('{');
    const jsonStr = isBase64 
      ? decodeURIComponent(escape(atob(payload.trim())))
      : payload.trim();
    const { src, width, height, alt, textAlign } = JSON.parse(jsonStr);
    
    return (
      <div 
        key={key} 
        style={{ 
          margin: '1.5rem 0', 
          display: 'flex', 
          justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start' 
        }}
      >
        <img 
          src={src} 
          alt={alt || "Notebook Image"} 
          style={{ 
            maxWidth: '100%', 
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            borderRadius: '0.5rem',
            border: '1px solid #f1f5f9'
          }} 
        />
      </div>
    );
  } catch (err) {
    console.error("PDF Resizable Image Decode Error:", err);
    return <span key={key} style={{ color: '#ef4444', fontSize: '10px' }}>Error rendering image</span>;
  }
};

/**
 * LabReportTemplate component for multi-page PDF generation.
 */
export const LabReportTemplate = forwardRef<HTMLDivElement, LabReportTemplateProps>(
  ({ title, content, date, author, id, allStructures = [] }, ref) => {
    const { t } = useTranslation();
    return (
      <div 
        ref={ref}
        id="lab-report-pdf-template"
        style={{ 
          backgroundColor: '#ffffff',
          width: '8.27in',
          margin: '0 auto',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .pdf-page {
            width: 8.27in;
            height: 11.69in;
            padding: 1.5in;
            box-sizing: border-box;
            position: relative;
            background-color: white;
            font-family: Georgia, serif;
            color: black;
            page-break-after: always;
          }
          .pdf-page * {
            box-sizing: border-box !important;
          }
          .pdf-structure-link {
            color: #2563eb !important;
            text-decoration: underline !important;
            font-weight: 600 !important;
            cursor: pointer !important;
          }
        `}} />

        {/* ... (rest of the component) ... */}

        {/* PAGE 1: COVER PAGE */}
        <div id="report-page-1" className="pdf-page" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          {/* ... (Cover Page content) ... */}
          <div style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '1.5rem', borderRadius: '1rem', display: 'inline-flex' }}>
              <img 
                src={`${window.location.origin}/logo/icon-white.png`} 
                style={{ width: '64px', height: '64px', display: 'block' }} 
                alt="Quercus Logo" 
              />
            </div>
          </div>
          
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
            QUERCUS
          </h1>
          <p style={{ fontSize: '14px', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', color: '#64748b', letterSpacing: '0.4em', marginBottom: '4rem' }}>
            Advanced Structural Analysis
          </p>

          <div style={{ 
            borderTop: '2px solid #f1f5f9', 
            borderBottom: '2px solid #f1f5f9', 
            padding: '3rem 0',
            marginBottom: '4rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '0.5rem', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.1em' }}>
              Lab Report
            </h2>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              {title || 'Untitled Entry'}
            </h3>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '2rem',
            textAlign: 'left',
            fontFamily: 'Arial, sans-serif',
            maxWidth: '5in',
            margin: '0 auto'
          }}>
            <div>
              <p style={{ fontSize: '9pt', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>{t.lrAuthor}</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{author}</p>
            </div>
            <div>
              <p style={{ fontSize: '9pt', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>{t.lrReportID}</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{id}</p>
            </div>
            <div>
              <p style={{ fontSize: '9pt', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>{t.lrDateCreated}</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{new Date(date).toLocaleDateString()}</p>
            </div>
            <div>
              <p style={{ fontSize: '9pt', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>{t.lrStatus}</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{t.lrVerifiedAnalysis}</p>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '1.5in', left: '0', right: '0', textAlign: 'center' }}>
            <p style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>
              © {new Date().getFullYear()} Quercus Code • Proprietary Lab Document
            </p>
          </div>
        </div>

        {/* PAGE 2: CONTENT PAGE */}
        <div id="report-page-2" className="pdf-page" style={{ padding: '0.75in' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1rem',
            marginBottom: '2.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '0.25rem', borderRadius: '0.25rem', marginRight: '0.5rem', display: 'flex' }}>
                <img 
                  src={`${window.location.origin}/logo/icon-white.png`} 
                  style={{ width: '16px', height: '16px', display: 'block' }} 
                  alt="Logo" 
                />
              </div>
              <span style={{ fontSize: '10pt', fontWeight: 'bold', color: '#0f172a' }}>QUERCUS</span>
            </div>
            <span style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>{title} • {id}</span>
          </div>

          <div style={{ color: '#334155' }}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({node, style, ...props}) => <h1 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem', marginTop: '1rem', ...style}} {...props} />,
                h2: ({node, style, ...props}) => <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginTop: '2rem', marginBottom: '0.75rem', ...style}} {...props} />,
                h3: ({node, style, ...props}) => <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginTop: '1.5rem', marginBottom: '0.5rem', ...style}} {...props} />,
                p: ({children, style}: any) => {
                  const processed = React.Children.map(children, child => {
                    if (typeof child === 'string') {
                      // Combined split for all custom nodes (legacy support for [[tag:base64]])
                      const parts = child.split(/(\[\[structure:[a-f0-9-]{36}\]\]|\[\[sketcher:[A-Za-z0-9+/=]+\]\]|\[\[calculator:[A-Za-z0-9+/=]+\]\]|\[\[code:[A-Za-z0-9+/=]+\]\]|\[\[image-workbench:[A-Za-z0-9+/=]+\]\]|\[\[resizable-image:[A-Za-z0-9+/=]+\]\])/g);
                      return parts.map((part, i) => {
                        // 1. Handle Structure Mentions
                        const structMatch = part.match(/\[\[structure:([a-f0-9-]{36})\]\]/);
                        if (structMatch) {
                          const sid = structMatch[1];
                          const s = allStructures.find(st => st.id === sid);
                          const name = s?.name || sid.substring(0, 8);
                          const url = `${window.location.origin}/?struct=${sid}`;
                          return (
                            <a 
                              key={i} 
                              href={url}
                              className="pdf-structure-link"
                              data-structure-id={sid}
                              style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}
                            >
                              @{name}
                            </a>
                          );
                        }

                        // 2. Handle Chemical Sketcher (Legacy Base64 Tag)
                        const sketchMatch = part.match(/\[\[sketcher:([A-Za-z0-9+/=]+)\]\]/);
                        if (sketchMatch) {
                          return renderSketcher(sketchMatch[1], i);
                        }

                        // 3. Handle Lab Calculator (Legacy Base64 Tag)
                        const calcMatch = part.match(/\[\[calculator:([A-Za-z0-9+/=]+)\]\]/);
                        if (calcMatch) {
                          return renderCalculator(calcMatch[1], i);
                        }

                        // 4. Handle Code Cell (Legacy Base64 Tag)
                        const codeMatch = part.match(/\[\[code:([A-Za-z0-9+/=]+)\]\]/);
                        if (codeMatch) {
                          return renderCodeCell(codeMatch[1], i);
                        }

                        // 5. Handle Image Workbench (Legacy Base64 Tag)
                        const workbenchMatch = part.match(/\[\[image-workbench:([A-Za-z0-9+/=]+)\]\]/);
                        if (workbenchMatch) {
                          return renderImageWorkbench(workbenchMatch[1], i);
                        }

                        // 6. Handle Resizable Image (Legacy Base64 Tag)
                        const resizableMatch = part.match(/\[\[resizable-image:([A-Za-z0-9+/=]+)\]\]/);
                        if (resizableMatch) {
                          return renderResizableImage(resizableMatch[1], i, true);
                        }
                        // Final fallback for normal text
                        return part;
                      });
                    }
                    return child;
                  });
                  return <p style={{ fontSize: '11pt', lineHeight: '1.6', marginBottom: '1rem', color: '#334155', ...style }}>{processed}</p>;
                },
                ul: ({node, ...props}) => <ul style={{listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem'}} {...props} />,
                ol: ({node, ...props}) => <ol style={{listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '1rem'}} {...props} />,
                li: ({node, ...props}) => <li style={{marginBottom: '0.5rem'}} {...props} />,
                table: ({node, ...props}) => <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', border: '1px solid #e2e8f0'}} {...props} />,
                th: ({node, ...props}) => <th style={{border: '1px solid #e2e8f0', padding: '0.75rem', backgroundColor: '#f8fafc', textAlign: 'left', fontWeight: 'bold', color: '#1e293b'}} {...props} />,
                td: ({node, ...props}) => <td style={{border: '1px solid #e2e8f0', padding: '0.75rem', color: '#334155'}} {...props} />,
                blockquote: ({node, ...props}) => <blockquote style={{borderLeft: '4px solid #e2e8f0', paddingLeft: '1rem', fontStyle: 'italic', color: '#64748b', marginBottom: '1rem'}} {...props} />,
                code: ({node, inline, className, children, ...props}: any) => {
                  const match = /language-([a-zA-Z0-9-]+)/.exec(className || '');
                  const lang = match ? match[1] : '';
                  const content = Array.isArray(children) ? children.join('') : String(children);
                  const cleanContent = content.replace(/\n$/, '');

                  if (!inline) {
                    if (lang === 'resizable-image') {
                      return renderResizableImage(cleanContent, 0, false);
                    }
                    if (lang === 'python-kernel') {
                      return renderCodeCell(cleanContent, 0);
                    }
                    if (lang === 'chemical-sketcher') {
                      return renderSketcher(cleanContent, 0);
                    }
                    if (lang === 'lab-calculator') {
                      return renderCalculator(cleanContent, 0);
                    }
                  }

                  return <code style={{backgroundColor: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.9em', color: '#e11d48'}} {...props}>{children}</code>;
                },
                pre: ({node, children, ...props}) => {
                  // Check if the inner child is one of our custom components
                  const childrenArray = React.Children.toArray(children);
                  const firstChild = childrenArray[0] as any;
                  
                  // If it's already rendered as a div (by our code component), it's custom
                  const isCustom = firstChild?.type === 'div' || 
                                  (firstChild?.props?.className && /language-(resizable-image|python-kernel|chemical-sketcher|lab-calculator)/.test(firstChild.props.className));
                  
                  if (isCustom) {
                    return <>{children}</>; 
                  }
                  
                  return <pre style={{backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', marginBottom: '1rem', border: '1px solid #e2e8f0'}} {...props}>{children}</pre>;
                },
                strong: ({node, ...props}) => <strong style={{fontWeight: 'bold', color: '#0f172a'}} {...props} />,
                a: ({node, ...props}) => <a style={{color: '#2563eb', textDecoration: 'underline'}} {...props} />,
                hr: ({node, ...props}) => <hr style={{border: 0, borderTop: '1px solid #e2e8f0', margin: '2rem 0'}} {...props} />,
              }}
            >
              {content || '*No content available for this entry.*'}
            </ReactMarkdown>
          </div>

          <div 
            style={{ 
              position: 'absolute',
              bottom: '0.75in',
              left: '0.75in',
              right: '0.75in',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
              color: '#94a3b8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '9pt',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <p style={{ margin: 0 }}>© {new Date().getFullYear()} Quercus Code</p>
            <p style={{ margin: 0 }}>Page 2</p>
          </div>
        </div>
      </div>
    );
  }
);

LabReportTemplate.displayName = 'LabReportTemplate';
