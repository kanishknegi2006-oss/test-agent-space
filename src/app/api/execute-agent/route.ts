import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/core/runAgent';

export const runtime = 'nodejs'; // Edge runtime doesn't support all Node APIs

/**
 * POST /api/execute-agent
 * Body: { agentId: string; prompt: string; apiKey?: string }
 *
 * Executes a single agent and returns { data: string } on success or
 * { error: string } on failure.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      agentId?: string;
      prompt?: string;
      apiKey?: string;
    };

    const { agentId, prompt, apiKey = '' } = body;

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid agentId' },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt' },
        { status: 400 }
      );
    }

    const output = await runAgent(agentId, prompt, apiKey);

    return NextResponse.json({ data: output }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution failed';
    console.error('[execute-agent] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
