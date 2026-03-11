import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Microscope } from 'lucide-react';
import type { Structure } from '../../lib/structuresService';

interface LabReportTemplateProps {
  title: string;
  content: string;
  date: string;
  author: string;
  id: string;
  allStructures?: Structure[];
}

/**
 * LabReportTemplate component for multi-page PDF generation.
 * Separated into Cover Page and Content Page.
 */
export const LabReportTemplate = React.forwardRef<HTMLDivElement, LabReportTemplateProps>(
  ({ title, content, date, author, id, allStructures = [] }, ref) => {
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
              <Microscope size={64} color="#ffffff" />
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
              <p style={{ fontSize: '9pt', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Author</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{author}</p>
            </div>
            <div>
              <p style={{ fontSize: '9pt', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Report ID</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{id}</p>
            </div>
            <div>
              <p style={{ fontSize: '9pt', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Date Created</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>{new Date(date).toLocaleDateString()}</p>
            </div>
            <div>
              <p style={{ fontSize: '9pt', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 0.25rem 0' }}>Status</p>
              <p style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>Verified Analysis</p>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '1.5in', left: '0', right: '0', textAlign: 'center' }}>
            <p style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>
              © {new Date().getFullYear()} Quercus Code • Proprietary Lab Document
            </p>
          </div>
        </div>

        {/* PAGE 2: CONTENT PAGE */}
        <div id="report-page-2" className="pdf-page">
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
                <Microscope size={16} color="#ffffff" />
              </div>
              <span style={{ fontSize: '10pt', fontWeight: 'bold', color: '#0f172a' }}>QUERCUS</span>
            </div>
            <span style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>{title} • {id}</span>
          </div>

          <div style={{ color: '#334155' }}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem', marginTop: '1rem'}} {...props} />,
                h2: ({node, ...props}) => <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginTop: '2rem', marginBottom: '0.75rem'}} {...props} />,
                h3: ({node, ...props}) => <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginTop: '1.5rem', marginBottom: '0.5rem'}} {...props} />,
                p: ({children}) => {
                  const processed = React.Children.map(children, child => {
                    if (typeof child === 'string') {
                      const parts = child.split(/(\[\[structure:[a-f0-9-]{36}\]\])/g);
                      return parts.map((part, i) => {
                        const match = part.match(/\[\[structure:([a-f0-9-]{36})\]\]/);
                        if (match) {
                          const sid = match[1];
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
                        return part;
                      });
                    }
                    return child;
                  });
                  return <p style={{marginBottom: '1rem', lineHeight: '1.6'}}>{processed}</p>;
                },
                ul: ({node, ...props}) => <ul style={{listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem'}} {...props} />,
                ol: ({node, ...props}) => <ol style={{listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '1rem'}} {...props} />,
                li: ({node, ...props}) => <li style={{marginBottom: '0.5rem'}} {...props} />,
                table: ({node, ...props}) => <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', border: '1px solid #e2e8f0'}} {...props} />,
                th: ({node, ...props}) => <th style={{border: '1px solid #e2e8f0', padding: '0.75rem', backgroundColor: '#f8fafc', textAlign: 'left', fontWeight: 'bold', color: '#1e293b'}} {...props} />,
                td: ({node, ...props}) => <td style={{border: '1px solid #e2e8f0', padding: '0.75rem', color: '#334155'}} {...props} />,
                blockquote: ({node, ...props}) => <blockquote style={{borderLeft: '4px solid #e2e8f0', paddingLeft: '1rem', fontStyle: 'italic', color: '#64748b', marginBottom: '1rem'}} {...props} />,
                code: ({node, ...props}) => <code style={{backgroundColor: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.9em', color: '#e11d48'}} {...props} />,
                pre: ({node, ...props}) => <pre style={{backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', marginBottom: '1rem', border: '1px solid #e2e8f0'}} {...props} />,
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
              bottom: '1.5in',
              left: '1.5in',
              right: '1.5in',
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
