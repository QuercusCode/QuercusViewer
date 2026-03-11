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

export const LabReportTemplate = React.forwardRef<HTMLDivElement, LabReportTemplateProps>(
  ({ title, content, date, author, id }, ref) => {
    return (
      <div 
        ref={ref}
        id="lab-report-pdf-template"
        className="relative bg-white p-[1.5in] w-[8.27in] min-h-[11.69in] print:shadow-none shadow-2xl mx-auto font-serif leading-relaxed overflow-hidden"
        style={{ fontSize: '12pt', color: '#000000' }}
      >
        {/* Header Branding */}
        <div 
          className="flex justify-between items-start border-b-2 pb-8 mb-12"
          style={{ borderColor: '#0f172a' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#0f172a' }}>
              <Microscope className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-none" style={{ color: '#0f172a' }}>QUERCUS</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-sans font-bold mt-1" style={{ color: '#64748b' }}>Structure Lab Report</p>
            </div>
          </div>
          <div className="text-right text-[9pt] font-sans" style={{ color: '#94a3b8' }}>
            <p>ID: {id}</p>
            <p>Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Metadata Block */}
        <div 
          className="grid grid-cols-2 gap-8 mb-16 p-8 rounded-xl border font-sans"
          style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" style={{ color: '#94a3b8' }} />
              <div>
                <p className="text-[9pt] uppercase font-bold tracking-wider" style={{ color: '#94a3b8' }}>Entry Title</p>
                <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{title || 'Untitled Entry'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" style={{ color: '#94a3b8' }} />
              <div>
                <p className="text-[9pt] uppercase font-bold tracking-wider" style={{ color: '#94a3b8' }}>Date Created</p>
                <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{new Date(date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5" style={{ color: '#94a3b8' }} />
              <div>
                <p className="text-[9pt] uppercase font-bold tracking-wider" style={{ color: '#94a3b8' }}>Author</p>
                <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>{author}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-30">
              <Microscope className="w-5 h-5" style={{ color: '#94a3b8' }} />
              <div>
                <p className="text-[9pt] uppercase font-bold tracking-wider" style={{ color: '#94a3b8' }}>Analysis Status</p>
                <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>Verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Markdown Content */}
        <div 
          className="prose prose-lg max-w-none"
          style={{ 
            color: '#334155', // slate-700
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || '*No content available for this entry.*'}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div 
          className="mt-20 pt-8 border-t flex justify-between items-center text-[9pt] font-sans"
          style={{ borderColor: '#f1f5f9', color: '#94a3b8' }}
        >
          <p>© {new Date().getFullYear()} Quercus Code • Advanced Structural Visualization</p>
          <p>Page 1 of 1</p>
        </div>

        {/* Watermark for internal reports */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none -rotate-45 z-0 select-none">
          <h2 className="text-[100pt] font-black border-4 px-8 py-2 whitespace-nowrap" style={{ borderColor: '#0f172a' }}>EXPERIMENTAL</h2>
        </div>
      </div>
    );
  }
);

LabReportTemplate.displayName = 'LabReportTemplate';
