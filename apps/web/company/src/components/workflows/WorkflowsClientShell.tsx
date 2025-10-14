"use client";
import React from 'react';

// Placeholder shell added to satisfy lingering import resolution error from previous build artifacts.
// Accepts optional initialWorkflows prop to align with stale page.tsx usage.
export interface WorkflowsClientShellProps {
  children?: React.ReactNode;
  initialWorkflows?: any[];
}

export function WorkflowsClientShell({ children, initialWorkflows }: WorkflowsClientShellProps) {
  // Could hydrate a client store here if needed. For now, just render children.
  return <>{children}</>; // Pass-through, ignore initialWorkflows
}

export default WorkflowsClientShell;
