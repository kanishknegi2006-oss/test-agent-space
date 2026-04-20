"use client";

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (name: string) => void;
  isDeploying: boolean;
}

export function DeployModal({ isOpen, onClose, onDeploy, isDeploying }: DeployModalProps) {
  const [pipelineName, setPipelineName] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) setPipelineName('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipelineName.trim()) return;
    onDeploy(pipelineName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl shadow-black/40 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold">Deploy &amp; Save Pipeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Give your pipeline a name to identify it in history.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pipeline-name" className="text-sm font-medium">Pipeline Name</label>
            <Input
              id="pipeline-name"
              placeholder="e.g., HR Resume Reviewer..."
              value={pipelineName}
              onChange={e => setPipelineName(e.target.value)}
              disabled={isDeploying}
              autoFocus
              className="h-10"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeploying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!pipelineName.trim() || isDeploying}
              className="flex-1"
            >
              {isDeploying ? 'Saving...' : '🚀 Save & Deploy'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
