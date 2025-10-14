import { NextResponse } from 'next/server';

// Minimal placeholder validation route. In production, this should proxy to the API service.
// Using 'any' for the context to avoid strict signature mismatch errors from Next.js build tooling.
export async function POST(_req: Request, { params }: any) {
	const id: string = params?.id;
	return NextResponse.json({ workflowId: id, issues: [] });
}

export const dynamic = 'force-dynamic';
