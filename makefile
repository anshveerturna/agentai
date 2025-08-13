dev:
	turbo run dev --parallel

deploy:
	supabase push && wrangler deploy
