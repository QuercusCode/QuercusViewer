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
        className="bg-white text-black p-[1.5in] w-[8.27in] min-h-[11.69in] print:shadow-none shadow-2xl mx-auto font-serif leading-relaxed"
        style={{ fontSize: '12pt' }}
      >
        {/* Header Branding */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-12">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Microscope className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">QUERCUS</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-slate-500 mt-1">Structure Lab Report</p>
            </div>
          </div>
          <div className="text-right text-[9pt] font-sans text-slate-400">
            <p>ID: {id}</p>
            <p>Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Metadata Block */}
        <div className="grid grid-cols-2 gap-8 mb-16 p-8 bg-slate-50 rounded-xl border border-slate-100 font-sans">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-[9pt] text-slate-400 uppercase font-bold tracking-wider">Entry Title</p>
                <p className="text-sm font-semibold text-slate-800">{title || 'Untitled Entry'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-[9pt] text-slate-400 uppercase font-bold tracking-wider">Date Created</p>
                <p className="text-sm font-semibold text-slate-800">{new Date(date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-[9pt] text-slate-400 uppercase font-bold tracking-wider">Author</p>
                <p className="text-sm font-semibold text-slate-800">{author}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-30">
              <Microscope className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-[9pt] text-slate-400 uppercase font-bold tracking-wider">Analysis Status</p>
                <p className="text-sm font-semibold text-slate-800">Verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Markdown Content */}
        <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-600 prose-strong:text-slate-900 prose-table:border prose-table:border-slate-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || '*No content available for this entry.*'}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[9pt] font-sans text-slate-400">
          <p>© {new Date().getFullYear()} Quercus Code • Advanced Structural Visualization</p>
          <p>Page 1 of 1</p>
        </div>

        {/* Watermark for internal reports */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none -rotate-45 z-0 select-none">
          <h2 className="text-[100pt] font-black border-4 border-slate-900 px-8 py-2 whitespace-nowrap">EXPERIMENTAL</h2>
        </div>
      </div>
    );
  }
);

LabReportTemplate.displayName = 'LabReportTemplate';
