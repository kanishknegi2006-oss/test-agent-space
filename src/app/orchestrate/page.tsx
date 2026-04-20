"use client";

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Network, Loader2 } from 'lucide-react';
import AgentBotPanel from '@/components/AgentBotPanel';

const Orchestrator = dynamic(() => import('@/components/Orchestrator'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#111]">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading canvas…</p>
      </div>
    </div>
  ),
});

interface DeployedPipeline {
  nodes: any[];
  edges: any[];
}

export default function OrchestratePage() {
  const [deployedPipeline, setDeployedPipeline] = useState<DeployedPipeline | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const handleDeploy = useCallback((nodes: any[], edges: any[]) => {
    setDeployedPipeline({ nodes, edges });
    setActiveJobId(null); // reset any previous job highlight
  }, []);

  const handleJobStart = useCallback((jobId: string) => {
    setActiveJobId(jobId);
  }, []);

  const handleJobComplete = useCallback(() => {
    // Keep jobId so canvas finishes its highlight, clear after delay
    setTimeout(() => setActiveJobId(null), 3000);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top bar */}
      <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur px-4 py-2.5 flex items-center gap-3">
        <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
          <Network className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-none">AgentSpace Orchestration Studio</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Build pipeline → Deploy → Chat with AgentBot → Watch live execution
          </p>
        </div>
        {activeJobId && (
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-primary font-medium">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            Executing: <span className="font-mono text-[10px] text-muted-foreground">{activeJobId}</span>
          </div>
        )}
      </div>

      {/* Main Split Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: AgentFlow Canvas — takes most space */}
        <div className="flex-1 overflow-hidden">
          <Orchestrator
            onDeploy={handleDeploy}
            externalJobId={activeJobId}
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-border shrink-0" />

        {/* Right: AgentBot Panel — fixed width sidebar */}
        <div className="w-[340px] shrink-0 flex flex-col overflow-hidden">
          <AgentBotPanel
            deployedPipeline={deployedPipeline}
            onJobStart={handleJobStart}
            onJobComplete={handleJobComplete}
          />
        </div>
      </div>
    </div>
  );
}
