"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FlowsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new workflows route
    router.replace('/workflows');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting to workflows...</p>
      </div>
    </div>
  );
}
