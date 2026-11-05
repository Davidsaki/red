import { NextRequest, NextResponse } from 'next/server';
import { finishProjectExecution } from '@/lib/project-transitions';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return finishProjectExecution(id, 'open');
}
