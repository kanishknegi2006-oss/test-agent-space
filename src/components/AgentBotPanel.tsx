"use client";

import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  isError?: boolean;
};

interface DeployedNode {
  id: string;
  agent_type: string;
  label: string;
  config?: any;
}

interface DeployedPipeline {
  nodes: DeployedNode[];
  edges: { source: string; target: string; sourceHandle?: string }[];
}

interface AgentBotPanelProps {
  deployedPipeline: DeployedPipeline | null;
  onJobStart?: (jobId: string) => void;
  onJobComplete?: () => void;
}

export default function AgentBotPanel({ deployedPipeline, onJobStart, onJobComplete }: AgentBotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: deployedPipeline
        ? '✅ Pipeline deployed! Select an agent and send a message.'
        : '⚡ Build a pipeline in AgentFlow and click **Deploy Pipeline** to get started.',
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derive available agents from deployed pipeline (exclude helper nodes)
  const agentNodes = (deployedPipeline?.nodes || []).filter(
    n => !['input', 'output', 'brain', 'condition', 'merge'].includes(n.config?.helperType || n.agent_type)
  );

  // Auto-select first agent when pipeline deploys
  useEffect(() => {
    if (agentNodes.length > 0 && !selectedAgent) {
      setSelectedAgent(agentNodes[0].agent_type);
    }
  }, [deployedPipeline]);

  // Post welcome message when pipeline is deployed
  useEffect(() => {
    if (deployedPipeline) {
      const agentLabels = agentNodes.map(n => n.label).join(', ') || 'agents';
      setMessages([{
        id: Date.now().toString(),
        text: `🚀 Pipeline deployed! Contains: **${agentLabels}**\n\nSend input to run the full pipeline and watch it execute live on the canvas.`,
        sender: 'bot'
      }]);
    }
  }, [deployedPipeline]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, jobLogs]);

  // Poll active job
  useEffect(() => {
    if (!activeJobId) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline/job/${activeJobId}`);
        if (!res.ok) return;
        const job = await res.json();
        setJobLogs(job.logs || []);

        if (job.status === 'completed') {
          clearInterval(poll);
          setActiveJobId(null);
          setIsProcessing(false);
          onJobComplete?.();
          setMessages(prev => [...prev, {
            id: job.id + '_out',
            text: job.output || 'No output returned.',
            sender: 'bot'
          }]);
        } else if (job.status === 'error') {
          clearInterval(poll);
          setActiveJobId(null);
          setIsProcessing(false);
          onJobComplete?.();
          setMessages(prev => [...prev, {
            id: job.id + '_err',
            text: `❌ Error: ${job.logs?.[job.logs.length - 1] || 'Unknown error'}`,
            sender: 'bot',
            isError: true
          }]);
        }
      } catch (e) { /* ignore */ }
    }, 900);
    return () => clearInterval(poll);
  }, [activeJobId]);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;
    if (!deployedPipeline) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: '⚠️ Please deploy a pipeline first using the Deploy Pipeline button in AgentFlow.', sender: 'bot', isError: true }]);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    setJobLogs([]);

    try {
      // Find the selected agent node using its real canvas ID
      const agentNode = agentNodes.find(n => n.agent_type === selectedAgent) || agentNodes[0];

      // Use the real Input/Output helper nodes from the deployed canvas (for correct highlighting)
      const inputHelper = deployedPipeline.nodes.find(
        n => n.config?.helperType === 'input' || n.agent_type === 'input'
      ) || { id: 'in', agent_type: 'input', label: 'Input', config: { helperType: 'input', category: 'helper' } };

      const outputHelper = deployedPipeline.nodes.find(
        n => n.config?.helperType === 'output' || n.agent_type === 'output'
      ) || { id: 'out', agent_type: 'output', label: 'Output', config: { helperType: 'output', category: 'helper' } };

      // Build a targeted mini-pipeline: Input → [selected agent] → Output
      // Using real canvas node IDs so the canvas highlights the right nodes
      const miniNodes = [
        { id: inputHelper.id, agent_type: 'input', label: 'Input', config: { helperType: 'input', category: 'helper' } },
        { id: agentNode.id, agent_type: agentNode.agent_type, label: agentNode.label, config: { ...agentNode.config, category: 'agent' } },
        { id: outputHelper.id, agent_type: 'output', label: 'Output', config: { helperType: 'output', category: 'helper' } },
      ];
      const miniEdges = [
        { source: inputHelper.id, target: agentNode.id },
        { source: agentNode.id, target: outputHelper.id },
      ];

      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_id: agentNode.agent_type,
          input: userMsg.text,
          nodes: miniNodes,
          edges: miniEdges,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start job');

      setActiveJobId(data.job_id);
      onJobStart?.(data.job_id);
    } catch (e: any) {
      setIsProcessing(false);
      setMessages(prev => [...prev, { id: 'err_' + Date.now(), text: e.message, sender: 'bot', isError: true }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shadow-md ${deployedPipeline ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-primary/20 border border-primary/30'}`}>
          <Bot className={`h-4 w-4 ${deployedPipeline ? 'text-emerald-400' : 'text-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-none truncate">AgentBot</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {deployedPipeline ? `${deployedPipeline.nodes.length} nodes deployed` : 'Waiting for pipeline…'}
          </p>
        </div>
        {deployedPipeline && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Agent Selector (only when pipeline deployed) */}
      {deployedPipeline && agentNodes.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] text-muted-foreground shrink-0">Active Agent:</span>
          <select
            className="flex-1 h-7 rounded border border-input bg-background text-xs px-2 outline-none focus:ring-1 focus:ring-primary"
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            disabled={isProcessing}
          >
            {agentNodes.map(n => (
              <option key={n.id} value={n.agent_type}>{n.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* No pipeline banner */}
      {!deployedPipeline && (
        <div className="mx-3 mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-300">Build your pipeline on the canvas, then click <strong>Deploy Pipeline</strong> to sync AgentBot.</p>
        </div>
      )}

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-primary text-white'
                : msg.isError
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-muted border border-border/50 text-foreground'
            }`}>
              <div className="whitespace-pre-wrap text-[13px]">{msg.text}</div>
            </div>
          </div>
        ))}

        {/* Live execution logs */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-xl px-3 py-2 bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-[11px] font-semibold text-primary">Executing pipeline…</span>
              </div>
              <div className="space-y-0.5">
                {jobLogs.map((log, i) => (
                  <div key={i} className={`text-[10px] font-mono ${
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('✅') ? 'text-emerald-400' :
                    log.includes('🧠') || log.includes('⚖️') ? 'text-amber-400' :
                    'text-muted-foreground'
                  }`}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-border">
        <div className="relative flex items-end gap-2">
          <Textarea
            className="min-h-[44px] h-[44px] max-h-[140px] resize-none bg-muted/40 text-sm py-3 pr-11 focus-visible:ring-1"
            placeholder={deployedPipeline ? 'Send input to pipeline…' : 'Deploy a pipeline first…'}
            value={input}
            disabled={isProcessing || !deployedPipeline}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
          />
          <Button
            size="icon"
            className="absolute right-1.5 bottom-1.5 h-8 w-8 rounded-full shrink-0"
            disabled={!input.trim() || isProcessing || !deployedPipeline}
            onClick={handleSubmit}
          >
            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 ml-0.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
