"use client";

import { useEffect, useState } from 'react';
import { X, Network, Trash2, DownloadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface PipelineRecord {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  created_at: string;
}

interface PipelineHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPipeline: (pipeline: PipelineRecord) => void;
}

export function PipelineHistorySidebar({ isOpen, onClose, onLoadPipeline }: PipelineHistorySidebarProps) {
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pipelines');
      if (!res.ok) throw new Error('Failed to fetch pipelines');
      setPipelines(await res.json());
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this pipeline?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/pipelines/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete pipeline');
      setPipelines(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Deleted', description: 'Pipeline removed from history.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sidebar panel */}
      <div className="relative z-10 flex flex-col w-[420px] h-full bg-background border-r border-border shadow-2xl animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/60">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/25">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Pipeline History</h2>
              <p className="text-[10px] text-muted-foreground">Load or delete saved pipelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pipeline List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Loading pipelines...</p>
            </div>
          ) : pipelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed border-border mt-4">
              <Network className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">No pipelines saved yet</p>
              <p className="text-xs text-muted-foreground mt-1">Build a pipeline and click Deploy to save it here.</p>
            </div>
          ) : (
            pipelines.map(pipeline => (
              <div key={pipeline.id} className="flex flex-col p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors shadow-sm">
                <div className="mb-3">
                  <h4 className="font-semibold text-sm">{pipeline.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(pipeline.created_at).toLocaleString()} &bull; {pipeline.nodes.length} nodes
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => { onLoadPipeline(pipeline); onClose(); }}
                  >
                    <DownloadCloud className="h-3.5 w-3.5" /> Load Canvas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    disabled={deletingId === pipeline.id}
                    onClick={e => handleDelete(pipeline.id, e)}
                  >
                    {deletingId === pipeline.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
