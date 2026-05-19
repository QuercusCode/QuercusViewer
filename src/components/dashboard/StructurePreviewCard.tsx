import React, { useEffect, useState } from 'react';
import { ExternalLink, Dna, Loader2, Database, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { type Structure } from '../../lib/structuresService';
import { useTranslation } from '../../lib/i18n';

interface StructurePreviewCardProps {
  structureId: string;
}

export const StructurePreviewCard: React.FC<StructurePreviewCardProps> = ({ structureId }) => {
  const { t } = useTranslation();
  const [structure, setStructure] = useState<Structure | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStructure = async () => {
      try {
        const { data, error } = await supabase
          .from('structures')
          .select('*')
          .eq('id', structureId)
          .single();
        
        if (error) throw error;
        setStructure(data);
      } catch (err) {
        console.error('Failed to fetch structure for preview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStructure();
  }, [structureId]);

  if (loading) {
    return (
      <div className="my-4 w-full max-w-md h-32 bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl flex items-center justify-center animate-pulse">
        <Loader2 className="w-6 h-6 text-neutral-700 animate-spin" />
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="my-4 w-full max-w-md p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
        <Database className="w-5 h-5 flex-shrink-0" />
        <p>{t.previewNotFound as string}</p>
      </div>
    );
  }

  const rcsbId = structure.name.match(/^[1-9][A-Z0-9]{3}$/i)?.[0]?.toUpperCase();

  const handleOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setLoading(true);
      const { getDownloadUrl } = await import('../../lib/structuresService');
      const url = await getDownloadUrl(structure.file_path);
      
      sessionStorage.setItem('pendingStructure', JSON.stringify({ 
        url, 
        name: structure.name, 
        fileType: structure.file_type.toLowerCase() 
      }));
      
      navigate('/');
      
      // Notify viewer in case it's already mounted (Studio Mode)
      window.dispatchEvent(new CustomEvent('quercus:load-structure'));
    } catch (err) {
      console.error('Failed to open structure in viewer:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-6 w-full max-w-md bg-[var(--bg-header)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-[var(--border-main)] transition-all group isolate">
      <div className="flex h-36">
        {/* Left: Thumbnail */}
        <div className="w-36 bg-[var(--bg-header)] flex-shrink-0 relative overflow-hidden flex items-center justify-center border-r border-[var(--border-main)]">
          {rcsbId ? (
            <img 
              src={`https://cdn.rcsb.org/images/structures/${rcsbId.toLowerCase()}_assembly-1.jpeg`}
              alt={rcsbId}
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <Dna className="w-10 h-10 text-neutral-800 group-hover:text-blue-500/20 transition-colors" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/50" />
        </div>

        {/* Right: Info */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase">
                {structure.file_type}
              </span>
              {rcsbId && (
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{rcsbId}</span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-tight group-hover:text-blue-300 transition-colors">
              {structure.metadata?.title || structure.name}
            </h4>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
               <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {Math.round((structure.file_size || 0) / 1024)} KB</span>
            </div>
            <button 
              onClick={handleOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              Open Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
