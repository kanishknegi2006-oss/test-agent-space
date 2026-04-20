import { NextRequest, NextResponse } from 'next/server';
import { AGENT_REGISTRY } from '@/lib/agentRegistry';

export const runtime = 'edge';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not configured. Falling back to default pipeline.");
      return NextResponse.json({
        pipeline: ["input", "tokenizer", "keyword_extractor", "output"],
        fallback: true,
        error: 'GEMINI_API_KEY not configured.'
      });
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const agentListStr = Object.values(AGENT_REGISTRY).map(a => `- ${a.id} (${a.name}): ${a.description}`).join('\n');

    const systemPrompt = `You are an AI system that translates user intent into advanced multi-agent orchestrations.
Given a user instruction, output a JSON structure defining nodes and edges to build a directed graph (pipeline).

Available Agents:
${agentListStr}
- brain (Brain Node): Evaluates text keywords and splits flow conditionally based on keywords.
- merge (Merge Node): Merges multiple parallel paths back together into a single sequence.
- condition (Condition Node): Basic rule-based IF block.

Rules:
1. Use ONLY the available agent IDs above.
2. Must include an "input" node initially.
3. Must include an "output" node ultimately.
4. Support branching by using a "brain" or "condition" node which branches to multiple parallel agents, then "merge" them together before continuing or outputting.
5. Return strictly valid JSON containing:
  - "nodes" (array of { "id": "1", "agent_id": "input" | "brain" | "merge" | <agent> })
  - "edges" (array of { "source": "1", "target": "2" })

Example output:
{
  "nodes": [
    {"id": "1", "agent_id": "input"},
    {"id": "2", "agent_id": "brain"},
    {"id": "3", "agent_id": "keyword_extractor"},
    {"id": "4", "agent_id": "resume_analyzer"},
    {"id": "5", "agent_id": "merge"},
    {"id": "6", "agent_id": "output"}
  ],
  "edges": [
    {"source": "1", "target": "2"},
    {"source": "2", "target": "3"},
    {"source": "2", "target": "4"},
    {"source": "3", "target": "5"},
    {"source": "4", "target": "5"},
    {"source": "5", "target": "6"}
  ]
}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Instruction: ${prompt}` }] }],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Gemini error:', errorText);
      throw new Error(`Gemini API error: ${res.statusText}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('No text returned from Gemini');
    }

    // Attempt to parse JSON safely
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse JSON from response.');

    const parsed = JSON.parse(match[0]);
    let nodes = parsed.nodes;
    let edges = parsed.edges;

    // Convert flat pipeline format to graph format if Gemini messes up
    if (parsed.pipeline && Array.isArray(parsed.pipeline) && !nodes) {
      nodes = parsed.pipeline.map((agent_id: string, i: number) => ({ id: String(i+1), agent_id }));
      edges = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({ source: nodes[i].id, target: nodes[i + 1].id });
      }
    }

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      throw new Error('Graph output requires nodes and edges arrays.');
    }

    // Safety + Validation
    // Filter to only valid agents
    const validNodes = nodes.filter((n: any) => n.agent_id === 'input' || n.agent_id === 'output' || n.agent_id === 'brain' || n.agent_id === 'merge' || n.agent_id === 'condition' || AGENT_REGISTRY[n.agent_id]);
    const validNodeIds = new Set(validNodes.map((n: any) => n.id));
    const validEdges = edges.filter((e: any) => validNodeIds.has(e.source) && validNodeIds.has(e.target));

    return NextResponse.json({ graph: { nodes: validNodes, edges: validEdges } });
  } catch (error: any) {
    console.error('AgentMagic API error:', error);
    // Fallback graph pipeline
    return NextResponse.json({
      graph: {
        nodes: [
          { id: "1", agent_id: "input" },
          { id: "2", agent_id: "tokenizer" },
          { id: "3", agent_id: "keyword_extractor" },
          { id: "4", agent_id: "output" }
        ],
        edges: [
          { source: "1", target: "2" },
          { source: "2", target: "3" },
          { source: "3", target: "4" }
        ]
      },
      fallback: true,
      error: error.message
    });
  }
}
