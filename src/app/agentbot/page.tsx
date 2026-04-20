"use client";

import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

type Message = { id: string; text: string; sender: 'user' | 'bot'; isError?: boolean };

export default function AgentBot() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hello! I am AgentBot. Select a pipeline or agent below and send me a message.", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('pipeline_custom'); // Default to deployed pipeline
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, jobLogs]);

  // Polling loop for active jobs
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
            setMessages(prev => [...prev, { id: job.id, text: job.output || "No output returned.", sender: 'bot' }]);
        } else if (job.status === 'error') {
            clearInterval(poll);
            setActiveJobId(null);
            setIsProcessing(false);
            setMessages(prev => [...prev, { id: job.id, text: `Pipeline Error: ${job.logs?.[job.logs.length - 1] || 'Unknown error'}`, sender: 'bot', isError: true }]);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);

    return () => clearInterval(poll);
  }, [activeJobId]);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    setJobLogs([]);

    try {
      // Create a simplified synthetic pipeline request based on the selected single agent
      // OR hit the custom pipeline id
      
      let nodes = [];
      let edges: any[] = [];
      
      if (selectedAgent === 'pipeline_custom') {
          // In a real system, the backend would load 'pipeline_custom' out of the database `pipelines` table.
          // For this MVP, we will send a mock basic pipeline if they select the custom deployed one.
          nodes = [
             { id: '1', agent_type: 'input', config: { helperType: 'input' } },
             { id: '2', agent_type: 'preprocessor', config: {} },
             { id: '3', agent_type: 'output', config: { helperType: 'output' } }
          ];
          edges = [
             { source: '1', target: '2' },
             { source: '2', target: '3' }
          ];
      } else {
          // NLP Agent mini-pipeline wrapper
          nodes = [
             { id: '1', agent_type: 'input', config: { helperType: 'input' } },
             { id: '2', agent_type: selectedAgent, config: {} },
             { id: '3', agent_type: 'output', config: { helperType: 'output' } }
          ];
          edges = [
             { source: '1', target: '2' },
             { source: '2', target: '3' }
          ];
      }

      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pipeline_id: selectedAgent,
          input: userMessage.text,
          nodes,
          edges
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start job');

      setActiveJobId(data.job_id);

    } catch (e: any) {
      setIsProcessing(false);
      setMessages(prev => [...prev, { id: 'err', text: e.message, sender: 'bot', isError: true }]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">AgentBot (Deployed Interface)</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Chat with pipelines deployed from AgentFlow</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="h-8 rounded-md border border-input bg-background/50 px-3 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            disabled={isProcessing}
          >
            <optgroup label="Deployed Pipelines">
              <option value="pipeline_custom">🤖 Smart NLP Processor (Default Flow)</option>
            </optgroup>
            <optgroup label="Direct NLP Agents">
              <option value="wordcount">🔢 Word Counter</option>
              <option value="tokenizer">🧩 Text Tokenizer</option>
              <option value="lowercase">⬇️ Lowercase Normalizer</option>
              <option value="keyword">🔑 Keyword Extractor</option>
            </optgroup>
          </select>
          <Button variant="outline" size="sm" className="h-8 gap-1 border-primary/30 text-primary" asChild>
             <Link href="/orchestrate">
                 <Network className="h-3.5 w-3.5" />
                 View AgentFlow Canvas
             </Link>
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.sender === 'user' 
                ? 'bg-primary text-white ml-auto' 
                : msg.isError 
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-muted border border-border/50 text-foreground'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}

        {/* Polling/Processing State */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-muted border border-border/50 text-foreground">
              <div className="flex items-center gap-2 mb-2 font-medium text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Executing Pipeline ({activeJobId})</span>
              </div>
              <div className="space-y-1">
                {jobLogs.map((log, i) => (
                  <div key={i} className={`text-[11px] font-mono ${
                    log.includes('❌') ? 'text-destructive' : 
                    log.includes('✅') ? 'text-green-500' : 
                    log.includes('🧠') || log.includes('⚖️') ? 'text-amber-400' :
                    'text-muted-foreground'
                  }`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2">
          <Textarea
            className="min-h-[52px] h-[52px] max-h-[200px] resize-none bg-background py-3.5 pr-12 focus-visible:ring-1"
            placeholder="Send a message to the pipeline..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button 
            size="icon" 
            className="absolute right-2 bottom-2 h-9 w-9 rounded-full" 
            disabled={!input.trim() || isProcessing}
            onClick={handleSubmit}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Executes the selected pipeline inside the async worker.
        </p>
      </div>
    </div>
  );
}
