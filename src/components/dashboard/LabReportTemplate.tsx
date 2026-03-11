import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Calendar, User, Microscope } from 'lucide-react';

interface LabReportTemplateProps {
  title: string;
  content: string;
  date: string;
  author: string;
  id: string;
}

/**
 * LabReportTemplate component for high-fidelity PDF generation.
 * 
 * IMPORTANT: This component avoids all Tailwind classes and modern CSS color functions (oklch)
 * to ensure maximum compatibility with the html2canvas renderer which fails on CSS Color Level 4.
 */
export const LabReportTemplate = React.forwardRef<HTMLDivElement, LabReportTemplateProps>(
  ({ title, content, date, author, id }, ref) => {
    return (
      <div 
        ref={ref}
        id="lab-report-pdf-template"
        // No className at all to avoid global Tailwind styles as much as possible
        style={{ 
          position: 'relative',
          margin: '0 auto',
          fontFamily: 'Georgia, serif',
          overflow: 'hidden',
          fontSize: '12pt', 
          color: '#000000',
          backgroundColor: '#ffffff',
          padding: '1.5in',
          width: '8.27in',
          minHeight: '11.69in',
          lineHeight: '1.6',
          boxSizing: 'border-box',
          // Reset any potential oklch variables inherited from Tailwind v4 root
          '--tw-ring-color': '#000000',
          '--tw-ring-offset-color': '#ffffff',
          '--tw-shadow': '0 0 #0000',
          '--tw-shadow-colored': '0 0 #0000',
        } as any}
      >
        {/* Strict CSS reset for html2canvas compatibility in the shadow of Tailwind v4 */}
        <style dangerouslySetInnerHTML={{ __html: `
          #lab-report-pdf-template * {
            box-sizing: border-box !important;
            --tw-ring-color: #000000 !important;
            --tw-ring-offset-color: #ffffff !important;
            --tw-shadow: 0 0 #0000 !important;
            --tw-text-opacity: 1 !important;
            --tw-bg-opacity: 1 !important;
            --tw-border-opacity: 1 !important;
          }
        `}} />

        {/* Header Branding */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '0.5rem', borderRadius: '0.5rem', marginRight: '0.75rem', display: 'flex' }}>
              <Microscope size={32} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '-0.025em', color: '#0f172a', margin: 0, padding: 0 }}>QUERCUS</h1>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', color: '#64748b', margin: '0.25rem 0 0 0', letterSpacing: '0.2em' }}>Structure Lab Report</p>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', fontFamily: 'Arial, sans-serif', color: '#94a3b8' }}>
            <p style={{ margin: 0 }}>ID: {id}</p>
            <p style={{ margin: 0 }}>Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Metadata Block */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          backgroundColor: '#f8fafc', 
          borderColor: '#f1f5f9',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: '0.75rem',
          padding: '2rem',
          marginBottom: '4rem',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <FileText size={20} color="#94a3b8" style={{ marginRight: '0.75rem' }} />
              <div>
                <p style={{ fontSize: '9pt', textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', margin: 0, letterSpacing: '0.05em' }}>Entry Title</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{title || 'Untitled Entry'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Calendar size={20} color="#94a3b8" style={{ marginRight: '0.75rem' }} />
              <div>
                <p style={{ fontSize: '9pt', textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', margin: 0, letterSpacing: '0.05em' }}>Date Created</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{new Date(date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <User size={20} color="#94a3b8" style={{ marginRight: '0.75rem' }} />
              <div>
                <p style={{ fontSize: '9pt', textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', margin: 0, letterSpacing: '0.05em' }}>Author</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{author}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', opacity: 0.3 }}>
              <Microscope size={20} color="#94a3b8" style={{ marginRight: '0.75rem' }} />
              <div>
                <p style={{ fontSize: '9pt', textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', margin: 0, letterSpacing: '0.05em' }}>Analysis Status</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Markdown Content */}
        <div style={{ color: '#334155' }}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h1 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem', marginTop: '1rem'}} {...props} />,
              h2: ({node, ...props}) => <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginTop: '2rem', marginBottom: '0.75rem'}} {...props} />,
              h3: ({node, ...props}) => <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginTop: '1.5rem', marginBottom: '0.5rem'}} {...props} />,
              p: ({node, ...props}) => <p style={{marginBottom: '1rem', lineHeight: '1.6'}} {...props} />,
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

        {/* Footer */}
        <div 
          style={{ 
            marginTop: '5rem',
            paddingTop: '2rem',
            borderTop: '1px solid #f1f5f9',
            color: '#94a3b8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '9pt',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} Quercus Code • Advanced Structural Visualization</p>
          <p style={{ margin: 0 }}>Page 1 of 1</p>
        </div>

        {/* Watermark for internal reports */}
        <div 
          style={{ 
            position: 'absolute',
            top: '50%', 
            left: '50%',
            opacity: 0.03, 
            pointerEvents: 'none', 
            transform: 'translate(-50%, -50%) rotate(-45deg)', 
            zIndex: 0, 
            userSelect: 'none' 
          }}
        >
          <h2 style={{ fontSize: '100pt', fontWeight: '900', border: '4px solid #0f172a', padding: '0.5rem 2rem', margin: 0, whiteSpace: 'nowrap', fontFamily: 'Arial, sans-serif' }}>EXPERIMENTAL</h2>
        </div>
      </div>
    );
  }
);

LabReportTemplate.displayName = 'LabReportTemplate';
