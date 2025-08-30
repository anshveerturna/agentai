'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewFlowRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new workflows creation
    router.replace('/workflows?view=editor&new=true');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting to workflow editor...</p>
      </div>
    </div>
  );
}