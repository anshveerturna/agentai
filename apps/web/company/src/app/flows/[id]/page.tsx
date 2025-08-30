'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FlowRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const flowId = params.id as string;

  useEffect(() => {
    // Redirect to the new workflows route
    router.replace(`/workflows/${flowId}`);
  }, [flowId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting to workflows...</p>
      </div>
    </div>
  );
}