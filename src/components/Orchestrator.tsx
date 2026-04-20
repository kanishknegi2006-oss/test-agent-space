"use client";

import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  MarkerType,
  Panel,
  NodeTypes,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Bot, Play, Plus, Trash2, Loader2, CheckCircle2, XCircle, GitBranch, ArrowDownToLine, ArrowUpFromLine, Brain, GitFork, Merge, RotateCcw, History, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeployModal } from '@/components/DeployModal';
import { PipelineHistorySidebar } from '@/components/PipelineHistorySidebar';
import { AgentMagicModal } from '@/components/AgentMagicModal';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentNodeData {
  label: string;
  agentId: string;
  agentType?: string; // NLP | LLM | HELPER
  category?: 'agent' | 'helper';
  status?: 'idle' | 'running' | 'done' | 'error';
  output?: string;
  prompt?: string;
  extractedFileText?: string;
  // Helper-specific config
  helperType?: 'input' | 'output' | 'brain' | 'condition' | 'merge';
  brainRules?: string;
  conditionVariable?: string;
  conditionOperator?: string;
  conditionValue?: string;
}

// ─── Icon Map for Helper Nodes ───────────────────────────────────────────────

const HELPER_ICON_MAP: Record<string, React.ReactNode> = {
  input: <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" />,
  output: <ArrowUpFromLine className="h-3.5 w-3.5 text-blue-400" />,
  brain: <Brain className="h-3.5 w-3.5 text-amber-400" />,
  condition: <GitFork className="h-3.5 w-3.5 text-orange-400" />,
  merge: <Merge className="h-3.5 w-3.5 text-cyan-400" />,
};

const HELPER_COLOR_MAP: Record<string, string> = {
  input: 'bg-emerald-500/20',
  output: 'bg-blue-500/20',
  brain: 'bg-amber-500/20',
  condition: 'bg-orange-500/20',
  merge: 'bg-cyan-500/20',
};

const HELPER_BORDER_MAP: Record<string, string> = {
  input: 'border-emerald-500/50',
  output: 'border-blue-500/50',
  brain: 'border-amber-500/50',
  condition: 'border-orange-500/50',
  merge: 'border-cyan-500/50',
};

// ─── Custom Agent Node Component ─────────────────────────────────────────────

function AgentNode({ data, selected }: { data: AgentNodeData; selected: boolean }) {
  const statusColors: Record<string, string> = {
    idle:    'border-border',
    running: 'border-primary animate-pulse',
    done:    'border-green-500',
    error:   'border-destructive',
  };
  const status = data.status ?? 'idle';
  const isHelper = data.category === 'helper';
  const helperType = data.helperType || '';

  const borderColor = status !== 'idle' 
    ? statusColors[status] 
    : isHelper 
      ? HELPER_BORDER_MAP[helperType] || 'border-border'
      : 'border-border';

  return (
    <div
      className={cn(
        'relative min-w-[160px] rounded-xl border-2 bg-card shadow-lg transition-all',
        borderColor,
        selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
      )}
    >
      {/* Left handle – incoming (hide for input node) */}
      {helperType !== 'input' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-primary !bg-background hover:!bg-primary transition-colors"
        />
      )}

      {/* Node body */}
      <div className="flex flex-col gap-1 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
            isHelper ? (HELPER_COLOR_MAP[helperType] || 'bg-primary/20') : 'bg-primary/20'
          )}>
            {isHelper ? (HELPER_ICON_MAP[helperType] || <Bot className="h-3.5 w-3.5 text-primary" />) : <Bot className="h-3.5 w-3.5 text-primary" />}
          </div>
          <span className="text-sm font-bold leading-tight truncate max-w-[100px]">
            {data.label}
          </span>
        </div>

        {data.agentType && (
          <Badge variant="outline" className={cn(
            "text-[9px] uppercase px-1.5 h-4 w-fit",
            isHelper ? 'border-amber-500/30 text-amber-400' : 'border-primary/30 text-primary'
          )}>
            {isHelper ? 'HELPER' : data.agentType === 'NLP' ? 'LOGIC' : data.agentType === 'LLM' ? 'AI' : data.agentType}
          </Badge>
        )}

        {/* Status indicator */}
        {status !== 'idle' && (
          <div className="flex items-center gap-1 mt-1">
            {status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            {status === 'done'    && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            {status === 'error'   && <XCircle className="h-3 w-3 text-destructive" />}
            <span className="text-[10px] text-muted-foreground capitalize">{status}</span>
          </div>
        )}

        {/* Output preview */}
        {data.output && status === 'done' && (
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {data.output}
          </p>
        )}
      </div>

      {/* Right handle – outgoing (hide for output node) */}
      {helperType !== 'output' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-primary !bg-background hover:!bg-primary transition-colors"
        />
      )}

      {/* Condition node gets a second "false" source handle at bottom */}
      {helperType === 'condition' && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="!h-3 !w-3 !border-2 !border-orange-400 !bg-background hover:!bg-orange-400 transition-colors"
        />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { agentNode: AgentNode };

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_AGENTS = [
  // NLP Agents
  { id: 'tokenizer', name: 'Tokenizer', type: 'NLP', isLlm: false, desc: 'Splits text into words', category: 'agent' as const },
  { id: 'lowercase', name: 'Lowercase Normalizer', type: 'NLP', isLlm: false, desc: 'Converts text to lowercase', category: 'agent' as const },
  { id: 'stopword_remover', name: 'Stopword Remover', type: 'NLP', isLlm: false, desc: 'Removes common words', category: 'agent' as const },
  { id: 'keyword_extractor', name: 'Keyword Extractor', type: 'NLP', isLlm: false, desc: 'extract top keywords', category: 'agent' as const },
  { id: 'sentence_splitter', name: 'Sentence Splitter', type: 'NLP', isLlm: false, desc: 'Splits text into sentences', category: 'agent' as const },
  { id: 'word_counter', name: 'Word Counter', type: 'NLP', isLlm: false, desc: 'Returns total word count', category: 'agent' as const },
  // AI Agents
  { id: 'resume_analyzer', name: 'Resume Analyzer', type: 'LLM', isLlm: true, desc: 'ATS score & feedback', allowFile: true, category: 'agent' as const },
  { id: 'resume_rewriter', name: 'Resume Rewriter', type: 'LLM', isLlm: true, desc: 'rewrite resume professionally', category: 'agent' as const },
  { id: 'improvement_generator', name: 'Improvement Generator', type: 'LLM', isLlm: true, desc: 'generate improvement suggestions', category: 'agent' as const },
  { id: 'research_agent', name: 'Research Agent', type: 'LLM', isLlm: true, desc: 'Perform deep research', category: 'agent' as const },
  // Web Dev Agents
  { id: 'html_generator', name: 'HTML Generator', type: 'DEV', isLlm: true, desc: 'Generate structural HTML', category: 'agent' as const },
  { id: 'react_component_builder', name: 'React Builder', type: 'DEV', isLlm: true, desc: 'Generate React components', category: 'agent' as const },
  { id: 'backend_api_generator', name: 'API Generator', type: 'DEV', isLlm: true, desc: 'Generate backend endpoints', category: 'agent' as const },
  { id: 'ui_designer', name: 'UI Designer', type: 'DEV', isLlm: true, desc: 'Design UI layout ideas', category: 'agent' as const },
  // Testing Agents
  { id: 'unit_test_generator', name: 'Test Generator', type: 'TEST', isLlm: true, desc: 'Generate unit tests', category: 'agent' as const },
  { id: 'code_debugger', name: 'Code Debugger', type: 'TEST', isLlm: true, desc: 'Find and fix bugs', category: 'agent' as const },
  { id: 'performance_analyzer', name: 'Perf Analyzer', type: 'TEST', isLlm: true, desc: 'Analyze code performance', category: 'agent' as const },
  // Data Science Agents
  { id: 'data_cleaner', name: 'Data Cleaner', type: 'DS', isLlm: true, desc: 'Sanitize/clean raw data', category: 'agent' as const },
  { id: 'statistical_analyzer', name: 'Stat Analyzer', type: 'DS', isLlm: true, desc: 'Analyze dataset statistics', category: 'agent' as const },
  { id: 'data_visualizer', name: 'Data Visualizer', type: 'DS', isLlm: true, desc: 'Generate charts & graphs', category: 'agent' as const },
  // Research Agents
  { id: 'hypothesis_generator', name: 'Hypothesis Gen', type: 'RESEARCH', isLlm: true, desc: 'Generate scientific hypothesis', category: 'agent' as const },
  { id: 'a_b_testing', name: 'A/B Tester', type: 'RESEARCH', isLlm: true, desc: 'Simulate A/B test analysis', category: 'agent' as const },
  { id: 'evaluation_metric', name: 'Eval Metric', type: 'RESEARCH', isLlm: true, desc: 'Calculate evaluation metrics', category: 'agent' as const },
  { id: 'plagiarism_checker', name: 'Plagiarism Checker', type: 'RESEARCH', isLlm: true, desc: 'Detect copied content', category: 'agent' as const },
  { id: 'citation_generator', name: 'Citation Generator', type: 'RESEARCH', isLlm: true, desc: 'Generate accurate citations', category: 'agent' as const },
  // RAG Agents
  { id: 'document_loader', name: 'Document Loader', type: 'RAG', isLlm: false, desc: 'Extracts raw text from files', allowFile: true, category: 'agent' as const },
  { id: 'text_chunker', name: 'Text Chunker', type: 'RAG', isLlm: false, desc: 'Splits semantic constraints', category: 'agent' as const },
  { id: 'embedding_generator', name: 'Vector Embedder', type: 'RAG', isLlm: true, desc: 'Math vector generation', category: 'agent' as const },
  { id: 'vector_db_upsert', name: 'DB Upsert', type: 'RAG', isLlm: false, desc: 'Store chunks in vector DB', category: 'agent' as const },
  { id: 'vector_search', name: 'Vector Search', type: 'RAG', isLlm: false, desc: 'Semantic DB search', category: 'agent' as const },
  { id: 'rag_synthesizer', name: 'RAG Synthesizer', type: 'RAG', isLlm: true, desc: 'Grounded generation', category: 'agent' as const },
];

const HELPER_NODES = [
  { id: 'input', name: 'Input', type: 'HELPER', isLlm: false, desc: 'Pipeline entry point', category: 'helper' as const, helperType: 'input' as const },
  { id: 'output', name: 'Output', type: 'HELPER', isLlm: false, desc: 'Pipeline exit & result', category: 'helper' as const, helperType: 'output' as const },
  { id: 'brain', name: 'Brain', type: 'HELPER', isLlm: false, desc: 'Intelligent keyword router', category: 'helper' as const, helperType: 'brain' as const },
  { id: 'condition', name: 'Condition', type: 'HELPER', isLlm: false, desc: 'Rule-based branching', category: 'helper' as const, helperType: 'condition' as const },
  { id: 'merge', name: 'Merge', type: 'HELPER', isLlm: false, desc: 'Combine multiple inputs', category: 'helper' as const, helperType: 'merge' as const },
];

const ALL_DEFS = [...PIPELINE_AGENTS, ...HELPER_NODES];

const HELPER_ICONS: Record<string, React.ElementType> = {
  input: ArrowDownToLine,
  output: ArrowUpFromLine,
  brain: Brain,
  condition: GitFork,
  merge: Merge,
};

// ─── Sidebar Palette ─────────────────────────────────────────────────────────

function AgentPalette({ onAddNode }: { onAddNode: (agent: any) => void }) {
  return (
    <div className="w-60 bg-card border-r border-border flex flex-col h-full shrink-0">

      {/* Agents Section */}
      <div className="p-3 border-b border-border">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5" />
          Agent Nodes
        </p>
      </div>
      <div className="overflow-y-auto p-2 space-y-0.5" style={{ maxHeight: '45%' }}>
        {PIPELINE_AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onAddNode(agent)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm hover:bg-primary/10 transition-colors group border border-transparent hover:border-primary/20"
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-xs truncate">{agent.name}</p>
              <p className="text-[9px] text-muted-foreground truncate">{agent.desc}</p>
            </div>
            <Badge variant="outline" className="text-[8px] shrink-0 px-1 h-3.5 border-primary/30 text-primary">
              {agent.type === 'NLP' ? '⚙️' : '🧠'}
            </Badge>
            <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-auto shrink-0" />
          </button>
        ))}
      </div>

      {/* Helper Nodes Section */}
      <div className="p-3 border-b border-t border-border mt-auto">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          Helper Nodes
        </p>
      </div>
      <div className="overflow-y-auto p-2 space-y-0.5 flex-1">
        {HELPER_NODES.map((helper) => {
          const Icon = HELPER_ICONS[helper.helperType] || GitBranch;
          return (
            <button
              key={helper.id}
              onClick={() => onAddNode(helper)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm hover:bg-amber-500/10 transition-colors group border border-transparent hover:border-amber-500/20"
            >
              <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0', HELPER_COLOR_MAP[helper.helperType])}>
                <Icon className="h-3 w-3 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-xs truncate">{helper.name}</p>
                <p className="text-[9px] text-muted-foreground truncate">{helper.desc}</p>
              </div>
              <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-auto shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Right Side Config Panel ─────────────────────────────────────────────────

function ConfigPanel({ 
  selectedNode, 
  agentDef, 
  setNodes 
}: { 
  selectedNode: Node<AgentNodeData>; 
  agentDef: any;
  setNodes: React.Dispatch<React.SetStateAction<Node<AgentNodeData>[]>>;
}) {
  const data = selectedNode.data;
  const isHelper = data.category === 'helper';
  const helperType = data.helperType || '';

  const updateData = (patch: Partial<AgentNodeData>) => {
    setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, ...patch } } : n));
  };

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-lg">{data.label}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px]",
            isHelper ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-primary/10 border-primary/20 text-primary'
          )}>
            {isHelper ? `🔧 Helper: ${helperType}` : agentDef?.type === 'NLP' ? '⚙️ NLP Agent' : '🧠 AI Agent'}
          </Badge>
          <Badge variant="outline" className="text-[10px] capitalize">
            Status: {data.status ?? 'idle'}
          </Badge>
        </div>
      </div>
      
      {/* Config Body */}
      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">

        {/* === INPUT NODE === */}
        {helperType === 'input' && (
          <div className="text-sm text-muted-foreground bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
            <p className="font-semibold text-emerald-400 mb-1">📥 Entry Point</p>
            This node captures the pipeline input (text or file). It passes data directly to the next connected node. No configuration needed.
          </div>
        )}

        {/* === OUTPUT NODE === */}
        {helperType === 'output' && (
          <>
            <div className="text-sm text-muted-foreground bg-blue-500/5 p-3 rounded-lg border border-blue-500/20">
              <p className="font-semibold text-blue-400 mb-1">📤 Exit Point</p>
              This node marks pipeline completion and returns the final result.
            </div>
            {data.output && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-blue-400">Final Output</label>
                <div className="text-xs text-foreground bg-muted p-3 rounded border border-border whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {data.output}
                </div>
              </div>
            )}
          </>
        )}

        {/* === BRAIN NODE === */}
        {helperType === 'brain' && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-amber-400">🧠 Routing Rules</label>
            <p className="text-[11px] text-muted-foreground">
              Define keyword→route rules. One per line. Format: <code className="bg-muted px-1 rounded">keyword:route_label</code>
            </p>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y font-mono"
              placeholder={"resume:resume_path\ncode:code_path\ndefault:fallback"}
              value={data.brainRules || ''}
              onChange={(e) => updateData({ brainRules: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">The Brain scans input text for keywords and routes accordingly. Use "default" as a catch-all.</p>
          </div>
        )}

        {/* === CONDITION NODE === */}
        {helperType === 'condition' && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-orange-400">⚖️ Condition Rule</label>
            <p className="text-[11px] text-muted-foreground">
              Evaluate a condition on the incoming text. TRUE → right output. FALSE → bottom output.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Variable</label>
                <select 
                  className="w-full h-8 rounded border border-input bg-transparent px-2 text-xs"
                  value={data.conditionVariable || 'length'}
                  onChange={(e) => updateData({ conditionVariable: e.target.value })}
                >
                  <option value="length">Length</option>
                  <option value="wordcount">Word Count</option>
                  <option value="contains">Contains</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Operator</label>
                <select 
                  className="w-full h-8 rounded border border-input bg-transparent px-2 text-xs"
                  value={data.conditionOperator || '>'}
                  onChange={(e) => updateData({ conditionOperator: e.target.value })}
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Value</label>
                <input 
                  className="w-full h-8 rounded border border-input bg-transparent px-2 text-xs"
                  placeholder="50"
                  value={data.conditionValue || ''}
                  onChange={(e) => updateData({ conditionValue: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* === MERGE NODE === */}
        {helperType === 'merge' && (
          <div className="text-sm text-muted-foreground bg-cyan-500/5 p-3 rounded-lg border border-cyan-500/20">
            <p className="font-semibold text-cyan-400 mb-1">🔀 Merge Point</p>
            Combines inputs from multiple connected nodes into a single output separated by newlines. Connect multiple source handles to this node.
          </div>
        )}

        {/* === AGENT NODES (Non-helper) === */}
        {!isHelper && agentDef?.isLlm && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Prompt Configuration</label>
            <textarea
              className="w-full flex min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              placeholder="Enter custom instructions for this node..."
              value={data.prompt || ''}
              onChange={(e) => updateData({ prompt: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">The output of the previous node will be appended to this prompt.</p>
          </div>
        )}

        {/* Input Section for agents */}
        {!isHelper && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Specific Input Base</label>
            {(agentDef as any)?.allowFile ? (
              <div className="flex flex-col gap-2">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => document.getElementById('file-upload')?.click()}>
                  <p className="text-[11px] text-muted-foreground">Click to upload PDF / DOC</p>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const mockText = `[Extracted from ${file.name}]\n\nSample resume content block parsed via local converter hook.`;
                        updateData({ extractedFileText: mockText });
                        toast({ title: 'File extracted', description: 'Content loaded into node.' });
                      }
                    }}
                  />
                </div>
                {data.extractedFileText && (
                  <div className="text-[10px] text-primary truncate">Attached: Contains File Data</div>
                )}
              </div>
            ) : (
              <textarea
                className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-xs"
                placeholder="Optional local text override (prepended to context)..."
                value={data.extractedFileText || ''}
                onChange={(e) => updateData({ extractedFileText: e.target.value })}
              />
            )}
          </div>
        )}

        {/* Output preview for Agent nodes */}
        {data.output && !isHelper && (
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-semibold text-primary">Output Preview</label>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded border border-border whitespace-pre-wrap">
              {data.output}
            </div>
          </div>
        )}

        {!isHelper && !agentDef?.isLlm && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg border border-border">
            This logic-based node requires no prompt configuration. It processes the text programmatically using deterministic rules.
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button className="w-full" onClick={() => setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, selected: false } : n))}>
          Close Panel
        </Button>
      </div>
    </div>
  );
}

// ─── Inner Canvas (must be inside ReactFlowProvider) ─────────────────────────

function OrchestratorCanvas({
  prompt,
  onDeploy,
  externalJobId,
}: {
  prompt: string;
  onDeploy?: (nodes: any[], edges: any[]) => void;
  externalJobId?: string | null;
}) {
  const { fitView } = useReactFlow();
  const nodeCounter = useRef(0);

  const [nodes, setNodes, onNodesChange] = useNodesState<AgentNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // ─── LocalStorage Persistence for Draft Pipeline ──────────────────────────
  useEffect(() => {
    try {
      const savedNodes = localStorage.getItem('agentflow_nodes');
      const savedEdges = localStorage.getItem('agentflow_edges');
      if (savedNodes && savedEdges && savedNodes !== '[]') {
        const parsedNodes = JSON.parse(savedNodes);
        setNodes(parsedNodes);
        setEdges(JSON.parse(savedEdges));
        
        let maxId = 0;
        parsedNodes.forEach((n: any) => {
          const idNum = parseInt(n.id, 10);
          if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
        });
        nodeCounter.current = maxId;
      }
    } catch (e) {}
    setIsInitialized(true);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('agentflow_nodes', JSON.stringify(nodes));
      localStorage.setItem('agentflow_edges', JSON.stringify(edges));
    }
  }, [nodes, edges, isInitialized]);

  // ─── External Job Polling (driven by AgentBot) ──────────────────────────────
  useEffect(() => {
    if (!externalJobId) return;

    // Reset all nodes to idle when a new external job starts
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' as const, output: undefined } })));

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline/job/${externalJobId}`);
        if (!res.ok) return;
        const job = await res.json();

        if (job.status === 'running' && job.current_node) {
          setNodes(nds => nds.map(n => {
            if (job.nodeOutputs?.[n.id]) return { ...n, data: { ...n.data, status: 'done' as const, output: job.nodeOutputs[n.id] } };
            if (n.id === job.current_node) return { ...n, data: { ...n.data, status: 'running' as const } };
            return { ...n, data: { ...n.data, status: 'idle' as const } };
          }));
        } else if (job.status === 'completed') {
          clearInterval(poll);
          if (job.nodeOutputs) {
            setNodes(nds => nds.map(n => ({
              ...n,
              data: { ...n.data, status: 'done' as const, ...(job.nodeOutputs[n.id] ? { output: job.nodeOutputs[n.id] } : {}) }
            })));
          }
        } else if (job.status === 'error') {
          clearInterval(poll);
        }
      } catch (e) { /* ignore */ }
    }, 900);

    return () => clearInterval(poll);
  }, [externalJobId, setNodes]);

  // ─── Deploy Pipeline ────────────────────────────────────────────────────────
  const handleDeployClick = useCallback(() => {
    if (nodes.length === 0) {
      toast({ title: 'Nothing to deploy', description: 'Add nodes first.', variant: 'destructive' });
      return;
    }
    setIsDeployModalOpen(true);
  }, [nodes]);

  const confirmDeploy = async (name: string) => {
    setIsDeploying(true);
    
    // Save FULL ReactFlow nodes/edges for history
    const fullNodes = nodes;
    const fullEdges = edges;

    // Send payload optimized for AgentBot
    const nodesPayload = nodes.map(n => ({
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
    }));
    const edgesPayload = edges.map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle }));
    
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          user_id: 'user_1', // MVP user
          nodes: fullNodes,
          edges: fullEdges,
        })
      });
      if (!res.ok) throw new Error('Failed to save pipeline');
      
      onDeploy?.(nodesPayload, edgesPayload);
      setIsDeployed(true);
      setIsDeployModalOpen(false);
      toast({ title: '🚀 Pipeline Deployed!', description: `Saved as "${name}" & synced with AgentBot.` });
    } catch (e: any) {
      toast({ title: 'Deploy Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleLoadPipeline = useCallback(async (pipeline: any) => {
    setNodes(pipeline.nodes);
    setEdges(pipeline.edges);
    setIsDeployed(true); // Automatically synced with AgentBot Locally
    
    let maxId = 0;
    pipeline.nodes.forEach((n: any) => {
      const idNum = parseInt(n.id, 10);
      if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
    });
    nodeCounter.current = maxId;

    // Auto-deploy to local AgentBot backend UI
    const nodesPayload = pipeline.nodes.map((n: any) => ({
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
    }));
    const edgesPayload = pipeline.edges.map((e: any) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle }));
    
    onDeploy?.(nodesPayload, edgesPayload);

    // Persist as a fresh insert to database so the standalone Live Demo tab picks it up as the latest
    try {
      await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pipeline.name,
          user_id: 'user_1',
          nodes: pipeline.nodes,
          edges: pipeline.edges,
        })
      });
    } catch (e) {
      console.error("Silent global sync failed", e);
    }

    toast({ title: 'Pipeline Deployed Globally', description: `"${pipeline.name}" is synced to Local & Live Demo tab.` });
  }, [setNodes, setEdges, onDeploy]);
  
  // ─── AgentMagic Generation ──────────────────────────────────────────────────
  const handleAgentMagicGenerate = useCallback((graph: { nodes: any[], edges: any[] }) => {
    // 1) Find DAG depths for dynamic layout
    const nodeDepths: Record<string, number> = {};
    const depthCounts: Record<number, number> = {};
    
    // Default depth 0
    graph.nodes.forEach(n => nodeDepths[n.id] = 0);
    
    // Propagate depths
    let changed = true;
    let loops = 0;
    while(changed && loops < 100) {
      changed = false;
      loops++;
      for(const e of graph.edges) {
         if (nodeDepths[e.target] <= nodeDepths[e.source]) {
            nodeDepths[e.target] = nodeDepths[e.source] + 1;
            changed = true;
         }
      }
    }

    const newNodes: Node[] = [];
    let localCounter = nodeCounter.current;
    const idMap: Record<string, string> = {}; // map from API id to local id

    // Track vertical cursor per depth
    const currentYPerDepth: Record<number, number> = {};

    graph.nodes.forEach(apiNode => {
      localCounter++;
      const idStr = localCounter.toString();
      idMap[apiNode.id] = idStr;
      
      const def = ALL_DEFS.find(d => d.id === apiNode.agent_id);
      if (!def) return;
      
      const depth = nodeDepths[apiNode.id] || 0;
      currentYPerDepth[depth] = (currentYPerDepth[depth] || 150);
      
      const x = depth * 320 + 100;
      const y = currentYPerDepth[depth];
      
      // increment y for next node at this depth
      currentYPerDepth[depth] += 220;
      
      const isHelper = def.category === 'helper';
      const helperType = (def as any).helperType;

      newNodes.push({
        id: idStr,
        type: 'agentNode',
        position: { x, y },
        data: {
          label: def.name,
          agentId: def.id,
          agentType: def.type,
          category: def.category,
          status: 'idle',
          ...(isHelper && { helperType }),
        },
      });
    });

    const newEdges: Edge[] = graph.edges.map(e => ({
       id: `e${idMap[e.source]}-${idMap[e.target]}`,
       source: idMap[e.source],
       target: idMap[e.target],
       type: 'smoothstep',
       animated: true,
       markerEnd: { type: MarkerType.ArrowClosed },
       style: { stroke: '#8b5cf6', strokeWidth: 2 },
    })).filter((e: any) => e.source && e.target);

    nodeCounter.current = localCounter;
    
    setNodes(newNodes);
    setEdges(newEdges);
    setIsDeployed(false);

    // Zoom to fit newly generated pipeline
    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
  }, [setNodes, setEdges, fitView]);

  const updateNode = useCallback(
    (id: string, status: AgentNodeData['status'], output?: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, status, ...(output !== undefined ? { output } : {}) } }
            : n
        )
      );
    },
    [setNodes]
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#7c3aed', strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  // Add a new node from the palette
  const addAgentNode = useCallback(
    (agent: any) => {
      if (nodes.length >= 10) {
        toast({ title: 'Performance Warning', description: 'Using more than 10 nodes may degrade performance.' });
      }

      nodeCounter.current += 1;
      const id = `${nodeCounter.current}`;

      const x = nodes.length * 250 + 100;
      const y = 200;

      const newNode: Node<AgentNodeData> = {
        id,
        type: 'agentNode',
        position: { x, y },
        data: {
          label: agent.name,
          agentId: agent.id,
          agentType: agent.type,
          category: agent.category || 'agent',
          status: 'idle',
          helperType: agent.helperType,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      // Removed auto-connect to previous node so users can manually link exactly how they want it in multi-agent environments.
      
      setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 50);
    },
    [nodes, setNodes, setEdges, fitView]
  );

  // Remove selected nodes & their edges
  const deleteSelected = useCallback(() => {
    setNodes((nds) => {
      const toDelete = new Set(nds.filter((n) => n.selected).map((n) => n.id));
      setEdges((eds) =>
        eds.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target))
      );
      return nds.filter((n) => !n.selected);
    });
  }, [setNodes, setEdges]);

  // Full reset
  const resetAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    nodeCounter.current = 0;
    setIsRunning(false);
  }, [setNodes, setEdges]);

  // ─── Dynamic Graph Traversal Execution ─────────────────────────────────────
  const handleRun = async () => {
    if (nodes.length === 0) {
      toast({ title: 'Empty pipeline', description: 'Add at least one node.', variant: 'destructive' });
      return;
    }

    // Find the input node, or fallback to root (no incoming edges)
    let startNode = nodes.find(n => n.data.helperType === 'input');
    if (!startNode) {
      startNode = nodes.find(n => !edges.some(e => e.target === n.id));
    }
    if (!startNode) startNode = nodes[0];

    // Reset all statuses
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'idle' as const, output: undefined } })));
    setIsRunning(true);

    try {
      // Build adjacency map: nodeId -> [{ edge, targetNode }]
      const adjacency: Record<string, { edge: Edge; target: Node<AgentNodeData> }[]> = {};
      for (const edge of edges) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode) {
          if (!adjacency[edge.source]) adjacency[edge.source] = [];
          adjacency[edge.source].push({ edge, target: targetNode });
        }
      }

      // Collect nodes to send to server in dynamic traversal order
      // First, get the dynamic execution order map for local UI
      const nodesPayload = [];
      for (const n of nodes) {
         nodesPayload.push({
          id: n.id,
          agent_type: n.data.helperType || n.data.agentId,
          config: {
            prompt: n.data.prompt,
            extractedFileText: n.data.extractedFileText,
            brainRules: n.data.brainRules,
            conditionVariable: n.data.conditionVariable,
            conditionOperator: n.data.conditionOperator,
            conditionValue: n.data.conditionValue,
            category: n.data.category,
            helperType: n.data.helperType,
          }
        });
      }

      // Mark first node running (input) locally or all pending
      for (const n of nodesPayload) updateNode(n.id, 'idle');

      // Kick off background job
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_id: 'custom_flow',
          input: prompt,
          nodes: nodesPayload,
          edges: edges.map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start pipeline');

      const jobId = data.job_id;
      toast({ title: 'Pipeline started', description: `Job ID: ${jobId}` });

      // Poll interval
      const poll = setInterval(async () => {
        try {
            const jobRes = await fetch(`/api/pipeline/job/${jobId}`);
            if (!jobRes.ok) return; // wait for next tick
            
            const job = await jobRes.json();
            
            // Sync UI with current job state
            if (job.status === 'running' && job.current_node) {
                // Dim all nodes to idle
                nodes.forEach(n => updateNode(n.id, 'idle'));
                // Mark the currently executing one as running
                updateNode(job.current_node, 'running');
                
                // If there are partial node outputs, update them
                if (job.nodeOutputs) {
                    for (const [nId, out] of Object.entries(job.nodeOutputs)) {
                       updateNode(nId, 'done', out as string);
                    }
                }
            } 
            else if (job.status === 'completed') {
                clearInterval(poll);
                // Mark all executed nodes as completed
                if (job.nodeOutputs) {
                    for (const [nId, out] of Object.entries(job.nodeOutputs)) {
                       updateNode(nId, 'done', out as string);
                    }
                }
                toast({ title: 'Pipeline completed!', description: 'Execution finished successfully.' });
                setIsRunning(false);
            }
            else if (job.status === 'error') {
                clearInterval(poll);
                toast({ title: 'Pipeline error', description: job.logs?.[job.logs.length - 1] || 'Error', variant: 'destructive' });
                if (job.current_node) updateNode(job.current_node, 'error');
                setIsRunning(false);
            }
        } catch (err) {
            console.error('Polling error', err);
        }
      }, 1000);
      
    } catch (e: any) {
      toast({ title: 'Pipeline error', description: e.message, variant: 'destructive' });
      nodes.forEach(n => updateNode(n.id, 'error'));
      setIsRunning(false);
    }
  };

  const selectedNode = nodes.find(n => n.selected);
  const selectedAgentDef = selectedNode ? ALL_DEFS.find(a => a.id === selectedNode.data.agentId || a.helperType === selectedNode.data.helperType) : null;

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Left palette */}
      <AgentPalette onAddNode={addAgentNode} />

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
          <Controls className="!border-border !bg-card !shadow-lg" showInteractive={false} />
          <MiniMap className="!border-border !bg-card" nodeColor="#7c3aed" maskColor="rgba(0,0,0,0.4)" />

          {/* Toolbar Panel */}
          <Panel position="top-right" className="flex gap-2 mr-4 mt-4">
            <Button size="sm" variant="outline"
              className="h-9 gap-1.5 text-xs border-border bg-card hover:border-destructive hover:text-destructive shadow-sm"
              onClick={deleteSelected}>
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
            <Button size="sm" variant="outline"
              className="h-9 gap-1.5 text-xs border-border bg-card shadow-sm"
              onClick={resetAll} disabled={isRunning}>
              <RotateCcw className="h-4 w-4" />
              Reset All
            </Button>
            <Button size="sm" variant="outline"
              className="h-9 gap-1.5 text-xs border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60 shadow-sm"
              onClick={() => setIsMagicModalOpen(true)}>
              <Sparkles className="h-4 w-4" />
              AgentMagic
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button size="sm" variant="outline"
              className={`h-9 gap-1.5 text-xs shadow-sm transition-all ${isDeployed ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-border bg-card hover:border-emerald-500 hover:text-emerald-400'}`}
              onClick={handleDeployClick} disabled={isRunning || nodes.length === 0}>
              {isDeployed ? <><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />Deployed</> : <>🚀 Deploy Pipeline</>}
            </Button>
            <Button size="sm" variant="outline"
              className="h-9 gap-1.5 text-xs border-border bg-card shadow-sm"
              onClick={() => setIsHistoryOpen(true)}>
              <History className="h-4 w-4" />
              History
            </Button>
            <Button size="sm"
              className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
              onClick={handleRun} disabled={isRunning} id="run-graph">
              {isRunning ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Running…</>
              ) : (
                <><Play className="h-4 w-4" />Run Pipeline</>
              )}
            </Button>
          </Panel>

          {/* Node count badge */}
          <Panel position="top-left" className="ml-4 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted-foreground shadow-sm">
              <GitBranch className="h-4 w-4 text-primary" />
              <span><strong className="text-foreground">{nodes.length}</strong> nodes</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Side Panel */}
      {selectedNode && selectedAgentDef && (
        <ConfigPanel selectedNode={selectedNode} agentDef={selectedAgentDef} setNodes={setNodes} />
      )}

      {/* Modals & Sidebars */}
      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploy={confirmDeploy}
        isDeploying={isDeploying}
      />
      <PipelineHistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadPipeline={handleLoadPipeline}
      />
      <AgentMagicModal
        isOpen={isMagicModalOpen}
        onClose={() => setIsMagicModalOpen(false)}
        onGenerate={handleAgentMagicGenerate}
      />
    </div>
  );
}

// ─── Public Export ────────────────────────────────────────────────────────────

interface OrchestratorProps {
  prompt?: string;
  onDeploy?: (nodes: any[], edges: any[]) => void;
  externalJobId?: string | null;
}

export default function Orchestrator({ prompt = '', onDeploy, externalJobId }: OrchestratorProps) {
  return (
    <ReactFlowProvider>
      <OrchestratorCanvas prompt={prompt} onDeploy={onDeploy} externalJobId={externalJobId} />
    </ReactFlowProvider>
  );
}
