import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { globalJobsMap } from '@/lib/jobStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    // Check memory map first (guarantees MVP works even without Supabase table)
    if (globalJobsMap.has(id)) {
      return NextResponse.json(globalJobsMap.get(id));
    }

    // Fallback to Supabase Database
    const { data: job, error } = await supabase
      .from('pipeline_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error fetching job:', error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
