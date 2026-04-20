import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    
    if (!id) {
       return NextResponse.json({ error: 'Pipeline ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting pipeline:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
