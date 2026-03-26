import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';

// Para publicar nueva actualización, insertar en Supabase:
// INSERT INTO changelogs (version, title, changes) VALUES (
//   'v1.3.0', 'Nueva actualización', 
//   '["Mejora 1", "Mejora 2"]'::jsonb
// )

interface Changelog {
  id: string;
  version: string;
  title: string;
  changes: string[];
  created_at: string;
}

export const useChangelog = () => {
  const { user } = useAuth();
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChangelog = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // 1. Obtener views del usuario
        const { data: views } = await supabase
          .from('changelog_views')
          .select('changelog_id')
          .eq('user_id', user.id);
          
        const viewedIds = views ? views.map(v => v.changelog_id) : [];

        // 2. Obtener changelogs activos
        const { data: logs } = await supabase
          .from('changelogs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (logs && logs.length > 0) {
          // Filtrar el primero no visto
          const unseen = logs.find(log => !viewedIds.includes(log.id));
          if (unseen) {
            setChangelog({
              ...unseen,
              changes: typeof unseen.changes === 'string' ? JSON.parse(unseen.changes) : unseen.changes
            });
          }
        }
      } catch (err) {
        console.error('Error fetching changelog:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChangelog();
  }, [user]);

  const markAsSeen = async (changelogId: string) => {
    if (!user) return;
    try {
      await supabase.from('changelog_views').insert({
        user_id: user.id,
        changelog_id: changelogId
      });
      setChangelog(null);
    } catch (err) {
      console.error('Error marking changelog as seen:', err);
    }
  };

  const dismiss = () => {
    setChangelog(null);
  };

  return { changelog, loading, markAsSeen, dismiss };
};

const ChangelogModal: React.FC = () => {
  const { changelog, loading, markAsSeen, dismiss } = useChangelog();

  if (loading || !changelog) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
      <div 
        className="w-full sm:max-w-[380px] bg-[#1e293b] sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden border border-[#334155] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 sm:zoom-in-95 duration-300 transform-gpu"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-[#e2b808]/10 border border-[#e2b808]/30 text-[#e2b808] text-xs font-bold rounded-full tracking-wider">
              {changelog.version}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-[#f8fafc] mb-2 leading-tight">
            ¿Qué hay de nuevo?
          </h2>
          
          <p className="text-[#94a3b8] mb-6 text-sm">{changelog.title}</p>
          
          <div className="space-y-3 mb-8">
            {changelog.changes.map((change, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5 bg-emerald-500/20 text-emerald-400 p-1 rounded-full shrink-0">
                  <Check size={12} strokeWidth={3} />
                </div>
                <p className="text-sm text-[#cbd5e1] leading-relaxed">{change}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => markAsSeen(changelog.id)}
              className="w-full bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] font-bold border-[#d4a017] py-3 text-base flex justify-center items-center gap-2 rounded-xl"
            >
              <Check size={18} /> Enterado
            </Button>
            <Button 
              onClick={dismiss}
              variant="secondary"
              className="w-full py-3 text-[#94a3b8] hover:text-[#f8fafc] flex justify-center items-center gap-2 border-transparent bg-transparent hover:bg-[#334155] rounded-xl"
            >
              <X size={18} /> Cerrar por ahora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
