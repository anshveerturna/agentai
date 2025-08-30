"use client";

import React from "react";
import { useWorkflowStore } from "@/store/workflowStore";

export function Minimap() {
  const zoom = useWorkflowStore((s) => s.viewport.zoom);
  return (
    <div className="h-28 w-44 rounded border bg-white/80 p-2 text-xs shadow">
      <div className="font-medium mb-1">Minimap</div>
      <div>Zoom: {Math.round(zoom * 100)}%</div>
      <div className="mt-2 h-16 w-full bg-neutral-100 border" />
    </div>
  );
}
