import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { globalJobsMap } from '@/lib/jobStore';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── NLP / Logic Agent Functions ─────────────────────────────────────────────

function preprocessText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function extractKeywords(input: string): string {
  const words = input.toLowerCase().split(/\W+/).filter(w => w.length > 4);
  const counts: Record<string, number> = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return "Top Keywords: " + sorted.map(k => k[0]).join(', ');
}

function tokenizeText(input: string): string {
  return JSON.stringify(input.split(/\s+/).filter(w => w.length > 0));
}

function removeStopwords(input: string): string {
  const stopwords = new Set(['the', 'is', 'at', 'which', 'and', 'on', 'a', 'an', 'of', 'in', 'to', 'for', 'with', 'it', 'as']);
  const words = input.split(/\s+/);
  return words.filter(w => !stopwords.has(w.toLowerCase())).join(' ');
}

function lowercaseNormalize(input: string): string {
  return input.toLowerCase();
}

function splitSentences(input: string): string {
  return JSON.stringify(input.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0));
}

function countWords(input: string): string {
  const count = input.split(/\s+/).filter(w => w.length > 0).length;
  return `Word count: ${count}`;
}

// ─── LLM Call ────────────────────────────────────────────────────────────────

async function callGemini(prompt: string, input: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const fullPrompt = prompt ? `${prompt}\n\n${input}` : input;

  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback mocks
  if (fullPrompt.includes("ats") || fullPrompt.toLowerCase().includes("analyze")) {
    return `ATS Score: ${Math.floor(Math.random() * 30 + 70)}/100\nFeedback: The resume is well formatted. Add more quantifiable metrics.`;
  } else if (fullPrompt.toLowerCase().includes("improve")) {
    return "Improvements: Add active verbs. Clear up the summary section.";
  } else if (fullPrompt.toLowerCase().includes("rewrite")) {
    return "Rewritten Resume:\n" + input.substring(0, 100) + "...\n(Optimized for ATS)";
  }

  return `Simulated LLM output for: ${input.substring(0, 40)}...`;
}

// ─── Helper Node Logic ───────────────────────────────────────────────────────

function processBrainNode(input: string, rulesStr: string): { output: string; routeLabel: string } {
  const rules = (rulesStr || '').split('\n').map(line => {
    const [keyword, route] = line.split(':').map(s => s.trim());
    return { keyword: keyword?.toLowerCase(), route };
  }).filter(r => r.keyword && r.route);

  const lowerInput = input.toLowerCase();

  for (const rule of rules) {
    if (rule.keyword !== 'default' && lowerInput.includes(rule.keyword)) {
      return { output: `[Brain routed to: ${rule.route}]`, routeLabel: rule.route };
    }
  }

  const defaultRule = rules.find(r => r.keyword === 'default');
  return {
    output: `[Brain routed to: ${defaultRule?.route || 'default'}]`,
    routeLabel: defaultRule?.route || 'default'
  };
}

function processConditionNode(input: string, variable: string, operator: string, value: string): { result: boolean; output: string } {
  let lhs: number = 0;
  const rhs = parseFloat(value) || 0;

  if (variable === 'length') {
    lhs = input.length;
  } else if (variable === 'wordcount') {
    lhs = input.split(/\s+/).filter(w => w.length > 0).length;
  } else if (variable === 'contains') {
    const containsResult = input.toLowerCase().includes(value.toLowerCase());
    return { result: containsResult, output: `Condition: input ${containsResult ? 'contains' : 'does not contain'} "${value}" → ${containsResult ? 'TRUE' : 'FALSE'}` };
  }

  let result = false;
  switch (operator) {
    case '>': result = lhs > rhs; break;
    case '<': result = lhs < rhs; break;
    case '==': result = lhs === rhs; break;
    case '!=': result = lhs !== rhs; break;
  }

  return { result, output: `Condition: ${variable}(${lhs}) ${operator} ${rhs} → ${result ? 'TRUE' : 'FALSE'}` };
}

// ─── Worker Execution Logic ───────────────────────────────────────────

async function executePipelineWorker(jobId: string, input: string, pipelineNodes: any[], pipelineEdges: any[]) {
    // 1. Mark as running
    const updateJob = async (patch: any) => {
        globalJobsMap.set(jobId, { ...globalJobsMap.get(jobId), ...patch });
        await supabase.from('pipeline_jobs').update(patch).eq('id', jobId);
    };

    await updateJob({ status: 'running' });

    const adjacency: Record<string, { target: string; sourceHandle?: string }[]> = {};
    for (const edge of pipelineEdges) {
      if (!adjacency[edge.source]) adjacency[edge.source] = [];
      adjacency[edge.source].push({ target: edge.target, sourceHandle: edge.sourceHandle });
    }

    const nodeMap: Record<string, any> = {};
    for (const node of pipelineNodes) nodeMap[node.id] = node;

    let startId = pipelineNodes.find((n: any) => n.config?.helperType === 'input')?.id;
    if (!startId && pipelineNodes.length > 0) startId = pipelineNodes[0].id;
    
    if (!startId) {
        await updateJob({ status: 'error', logs: ['No start node found'] });
        return;
    }

    let currentInput = input || '';
    const logs: string[] = [];
    const nodeOutputs: Record<string, string> = {};
    const visited = new Set<string>();
    let currentId: string | undefined = startId;
    let depth = 0;
    const MAX_DEPTH = 15;

    try {
        while (currentId && depth < MAX_DEPTH) {
            if (visited.has(currentId)) {
                logs.push(`⚠️ Loop detected at ${currentId}, breaking.`);
                break;
            }
            visited.add(currentId);
            depth++;

            const node = nodeMap[currentId];
            if (!node) break;

            const agentType = node.agent_type;
            const config = node.config || {};
            const isHelper = config.category === 'helper';
            const helperType = config.helperType;
            const prompt = config.prompt || '';

            // Emit Progress
            await updateJob({ 
                current_node: currentId, 
                logs: [...logs, `Executing ${agentType} (${currentId})...`] 
            });

            // Simulate slight processing delay for GUI effect
            await new Promise(r => setTimeout(r, 600));

            if (config.extractedFileText) {
                currentInput = config.extractedFileText + "\n\n" + currentInput;
            }

            let output = currentInput;
            let nextNodeId: string | undefined = undefined;

            if (isHelper) {
                switch (helperType) {
                  case 'input':
                  case 'output':
                  case 'merge':
                    output = currentInput; 
                    if(helperType === 'output') logs.push(`✅ Pipeline complete. Output captured.`);
                    break;
                  case 'brain': {
                    const brainResult = processBrainNode(currentInput, config.brainRules || '');
                    output = brainResult.output + '\n' + currentInput; // pass context along
                    logs.push(`🧠 ${brainResult.output}`);
                    break;
                  }
                  case 'condition': {
                    const condResult = processConditionNode(currentInput, config.conditionVariable || 'length', config.conditionOperator || '>', config.conditionValue || '0');
                    output = currentInput; // passing text along
                    logs.push(`⚖️ ${condResult.output}`);
                    const connections = adjacency[currentId] || [];
                    if (condResult.result) {
                      nextNodeId = (connections.find(c => c.sourceHandle !== 'false') || connections[0])?.target;
                    } else {
                      nextNodeId = (connections.find(c => c.sourceHandle === 'false') || connections[connections.length - 1])?.target;
                    }
                    break;
                  }
                }
            } else {
                if (agentType === 'preprocessor') output = preprocessText(currentInput);
                else if (agentType === 'analyzer') output = await callGemini(prompt || 'Analyze this resume...', currentInput);
                else if (agentType === 'keyword') output = extractKeywords(currentInput);
                else if (agentType === 'improver') output = await callGemini(prompt || 'Improve this text...', currentInput);
                else if (agentType === 'rewriter') output = await callGemini(prompt || 'Rewrite...', currentInput);
                else if (agentType === 'tokenizer') output = tokenizeText(currentInput);
                else if (agentType === 'stopword') output = removeStopwords(currentInput);
                else if (agentType === 'lowercase') output = lowercaseNormalize(currentInput);
                else if (agentType === 'sentence') output = splitSentences(currentInput);
                else if (agentType === 'wordcount') output = countWords(currentInput);
                else output = currentInput;
            }

            currentInput = output;
            nodeOutputs[currentId] = output;

            if (nextNodeId === undefined) {
                const connections = adjacency[currentId] || [];
                nextNodeId = connections.length > 0 ? connections[0].target : undefined;
            }

            if (helperType === 'output') break;
            currentId = nextNodeId;
        }

        // 3. Mark as completed and save output
        await updateJob({
            status: 'completed',
            output: currentInput,
            nodeOutputs,
            logs: [...logs, `✅ Pipeline completed successfully.`]
        });

    } catch (e: any) {
        await updateJob({
            status: 'error',
            logs: [...logs, `❌ Error: ${e.message}`]
        });
    }
}

// ─── API Definition ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { pipeline_id, input, nodes, edges } = await req.json();

    // Generate unique ID
    const jobId = 'job_' + Math.random().toString(36).substring(2, 10);
    
    const initialJob = {
        id: jobId,
        pipeline_id: pipeline_id || 'custom',
        status: 'queued',
        input,
        current_node: null,
        logs: ['Job created and queued.'],
        created_at: new Date().toISOString()
    };
    
    // Save to DB and Memory Map
    globalJobsMap.set(jobId, initialJob);
    await supabase.from('pipeline_jobs').insert([initialJob]);

    // Kick off worker asynchronously (don't wait for it)
    setTimeout(() => {
        executePipelineWorker(jobId, input, nodes || [], edges || []);
    }, 100);

    // Return the Job ID immediately for polling
    return NextResponse.json({ job_id: jobId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
