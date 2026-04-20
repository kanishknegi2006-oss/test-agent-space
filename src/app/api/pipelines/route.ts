import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id') || 'user_1';

    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching pipelines:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(pipelines);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, user_id, nodes, edges } = body;

    if (!name || !nodes || !edges) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = user_id || 'user_1';

    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .insert({
        name,
        user_id: userId,
        nodes,
        edges,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error saving pipeline:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(pipeline);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
