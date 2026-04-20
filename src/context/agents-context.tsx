"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Agent } from '@/lib/types';
import { MOCK_AGENTS } from '@/lib/data';

// ─── Orchestration Types ─────────────────────────────────────────────────────

export type PipelineMode = 'sequential' | 'parallel';

export interface Workflow {
  id: string;
  name: string;
  agents: Agent[];         // Ordered list of agents in the pipeline
  mode: PipelineMode;      // How agents execute relative to each other
  createdAt: number;
}

export interface WorkflowResult {
  workflowId: string;
  agentOutputs: Record<string, string>; // agentId -> output
  finalOutput: string;                  // Aggregated / combined result
  status: 'idle' | 'running' | 'completed' | 'failed';
}

// ─── Context Types ───────────────────────────────────────────────────────────

interface AgentsContextType {
  // Agent registry
  agents: Agent[];
  addAgent: (agent: Agent) => void;

  // Orchestration
  savedWorkflows: Workflow[];
  activeWorkflow: Workflow | null;
  workflowResult: WorkflowResult | null;

  /** Combine multiple agents into a named pipeline workflow */
  createCombinedAgent: (
    selectedAgents: Agent[],
    name: string,
    mode?: PipelineMode
  ) => Workflow;

  /** Set the active (currently selected) workflow */
  setActiveWorkflow: (workflow: Workflow | null) => void;

  /** Store a workflow result after execution */
  setWorkflowResult: (result: WorkflowResult | null) => void;

  /** Delete a saved workflow by id */
  deleteWorkflow: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [savedWorkflows, setSavedWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);

  // ── Hydrate agents from localStorage ──
  useEffect(() => {
    const savedAgents = localStorage.getItem('agentspace_custom_agents');
    if (savedAgents) {
      try {
        const parsed = JSON.parse(savedAgents) as Agent[];
        const customIds = new Set(parsed.map((a) => a.id));
        const filteredMocks = MOCK_AGENTS.filter((a) => !customIds.has(a.id));
        setAgents([...filteredMocks, ...parsed]);
      } catch (e) {
        console.error('Failed to parse custom agents', e);
      }
    }
  }, []);

  // ── Hydrate workflows from localStorage ──
  useEffect(() => {
    const storedWorkflows = localStorage.getItem('agentspace_workflows');
    if (storedWorkflows) {
      try {
        setSavedWorkflows(JSON.parse(storedWorkflows) as Workflow[]);
      } catch (e) {
        console.error('Failed to parse saved workflows', e);
      }
    }
  }, []);

  // ── Persist workflows ──
  const persistWorkflows = (workflows: Workflow[]) => {
    localStorage.setItem('agentspace_workflows', JSON.stringify(workflows));
    setSavedWorkflows(workflows);
  };

  // ── Agent helpers ──
  const addAgent = (agent: Agent) => {
    setAgents((prev) => {
      const updated = [...prev, agent];
      const customAgents = updated.filter(
        (a) => !MOCK_AGENTS.some((m) => m.id === a.id)
      );
      localStorage.setItem(
        'agentspace_custom_agents',
        JSON.stringify(customAgents)
      );
      return updated;
    });
  };

  // ── Orchestration helpers ──

  /**
   * Combines multiple agents into an orchestrated pipeline (workflow).
   * The workflow is persisted in localStorage and set as the active workflow.
   */
  const createCombinedAgent = (
    selectedAgents: Agent[],
    name: string,
    mode: PipelineMode = 'parallel'
  ): Workflow => {
    const workflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name,
      agents: selectedAgents,
      mode,
      createdAt: Date.now(),
    };

    const updated = [workflow, ...savedWorkflows];
    persistWorkflows(updated);
    setActiveWorkflow(workflow);
    return workflow;
  };

  const deleteWorkflow = (id: string) => {
    const updated = savedWorkflows.filter((w) => w.id !== id);
    persistWorkflows(updated);
    if (activeWorkflow?.id === id) setActiveWorkflow(null);
  };

  return (
    <AgentsContext.Provider
      value={{
        agents,
        addAgent,
        savedWorkflows,
        activeWorkflow,
        workflowResult,
        createCombinedAgent,
        setActiveWorkflow,
        setWorkflowResult,
        deleteWorkflow,
      }}
    >
      {children}
    </AgentsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAgents() {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error('useAgents must be used within an AgentsProvider');
  }
  return context;
}
