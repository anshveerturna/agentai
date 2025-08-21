'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreateAgentModal from './CreateAgentModal';

export function CreateAgentDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="default" onClick={() => setOpen(true)}>➕ Add New Agent</Button>
      <CreateAgentModal open={open} onOpenChange={setOpen} />
    </>
  );
}
