// Proxy POST /api/company/workflows/:id/validate to backend API
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	const { id } = await ctx.params;
	const apiBase = process.env.NEXT_PUBLIC_API_URL;
	if (!apiBase) {
		return new Response(JSON.stringify({ error: 'NEXT_PUBLIC_API_URL is not set' }), { status: 500, headers: { 'content-type': 'application/json' } });
	}

	const headers: Record<string, string> = { 'content-type': 'application/json' };
	try {
		// In dev, if no Authorization header is present, inject a permissive bearer to hit the API
		const auth = (_req.headers.get('authorization') || '').trim();
		if (!auth && process.env.NODE_ENV !== 'production') {
			headers.Authorization = 'Bearer dev-token';
			headers['x-company-id'] = '00000000-0000-0000-0000-000000000000';
		} else if (auth) {
			headers.Authorization = auth;
		}
	} catch {}

	const url = `${apiBase}/workflows/${id}/validate`;
	try {
		const res = await fetch(url, { method: 'POST', headers, cache: 'no-store' });
		const body = await res.text();
		return new Response(body, {
			status: res.status,
			headers: { 'content-type': res.headers.get('content-type') || 'application/json' }
		});
	} catch (e: any) {
		return new Response(JSON.stringify({ error: 'Proxy error', detail: String(e?.message || e) }), { status: 502, headers: { 'content-type': 'application/json' } });
	}
}

