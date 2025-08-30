"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewWorkflowRedirect() {
  const router = useRouter();
  useEffect(() => {
    const id = Math.random().toString(36).slice(2);
    router.replace(`/workflows/${id}`);
  }, [router]);
  return null;
}
