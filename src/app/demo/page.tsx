"use client";

import { useEffect, useState } from 'react';
import AgentBotPanel from '@/components/AgentBotPanel';
import { Loader2, Zap, Rocket } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function DemoPage() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [pipelineName, setPipelineName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLatestPipeline() {
      try {
        const res = await fetch('/api/pipelines?user_id=user_1');
        const data = await res.json();
        
        if (data && data.length > 0) {
          // get the most recently created pipeline
          const latest = data[0];
          setPipelineName(latest.name);
          
          // Map to DeployedPipeline format (optimized for AgentBotPanel payload config)
          const formatted = {
            nodes: latest.nodes.map((n: any) => ({
              id: n.id,
              agent_type: n.data.helperType || n.data.agentId,
              label: n.data.label,
              config: {
                prompt: n.data.prompt,
                brainRules: n.data.brainRules,
                conditionVariable: n.data.conditionVariable,
                conditionOperator: n.data.conditionOperator,
                conditionValue: n.data.conditionValue,
                category: n.data.category,
                helperType: n.data.helperType,
              }
            })),
            edges: latest.edges.map((e: any) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle }))
          };
          setPipeline(formatted);
        }
      } catch (e) {
        console.error("Failed to load pipeline automatically", e);
      } finally {
        setLoading(false);
      }
    }
    loadLatestPipeline();
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-cover flex flex-col items-center justify-center p-4 relative" style={{ backgroundImage: "radial-gradient(ellipse at top, #111 0%, #000 100%)"}}>
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="text-center mb-8 max-w-2xl relative z-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mx-auto w-16 h-16 bg-card/60 backdrop-blur rounded-2xl flex items-center justify-center mb-6 border border-border/50 shadow-2xl">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
             <Rocket className="h-6 w-6 text-primary" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">AgentBot Live Demo</h1>
        <p className="text-lg text-muted-foreground">Test your advanced AI pipelines through a conversational interface. Powered by AgentSpace Engine.</p>
        
        {pipelineName && (
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 uppercase tracking-widest shadow-[0_0_15px_rgba(52,211,153,0.15)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active System: {pipelineName}
            </span>
          </div>
        )}
      </div>

      <Card className="w-full max-w-4xl h-[650px] shadow-2xl shadow-black/50 border-primary/20 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
        {loading ? (
           <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full blur-xl" />
                <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
             </div>
             <p className="text-sm font-medium tracking-wide">Connecting to backend engine...</p>
           </div>
        ) : !pipeline ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8 text-center bg-background/50">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-2 border border-border">
               <Zap className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div>
               <p className="text-xl font-medium text-white mb-2">No active pipeline found</p>
               <p className="text-sm max-w-md mx-auto">Please go back to the Orchestrator, build an AI flow, and click <strong>Deploy Pipeline</strong>.</p>
            </div>
          </div>
        ) : (
          <AgentBotPanel 
             deployedPipeline={pipeline} 
             onJobStart={() => {}} 
             onJobComplete={() => {}} 
          />
        )}
      </Card>
      
    </div>
  );
}
