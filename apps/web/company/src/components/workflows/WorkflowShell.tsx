"use client";

import React from "react";
import { Canvas } from "./canvas/Canvas";
import { Minimap } from "@/components/workflows/canvas/Minimap";
import { useWorkflowStore } from "@/store/workflowStore";
import type { NodeModel, UUID } from "@/types/workflow";

export function WorkflowShell() {
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const zoom = useWorkflowStore((s) => s.viewport.zoom);
  const zoomBy = useWorkflowStore((s) => s.zoomBy);
  const addNode = useWorkflowStore((s) => s.addNode);
  const pushHistory = useWorkflowStore((s) => s.pushHistory);
  const viewport = useWorkflowStore((s) => s.viewport);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "z") {
        if (e.shiftKey) redo(); else undo();
        e.preventDefault();
      }
      if (cmd && e.key === "+") {
        zoomBy(1.1);
      }
      if (cmd && e.key === "-") {
        zoomBy(1 / 1.1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo, zoomBy]);

  const centerCanvasPoint = React.useCallback(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const w = window.innerWidth - 64 - 320; // minus sidebars approx
    const h = window.innerHeight - 64;
    return { x: (w / 2 - viewport.offset.x) / viewport.zoom, y: (h / 2 - viewport.offset.y) / viewport.zoom };
  }, [viewport.offset.x, viewport.offset.y, viewport.zoom]);

  const makeNode = (kind: NodeModel["kind"], label: string): Partial<NodeModel> => {
    const pos = centerCanvasPoint();
    const id = crypto.randomUUID();
    const ports = kind === "trigger"
      ? [{ id: crypto.randomUUID() as UUID, name: "out", direction: "out" as const, kind: "control" as const }]
      : kind === "condition"
      ? [
          { id: crypto.randomUUID() as UUID, name: "in", direction: "in" as const, kind: "control" as const },
          { id: crypto.randomUUID() as UUID, name: "true", direction: "out" as const, kind: "control" as const },
          { id: crypto.randomUUID() as UUID, name: "false", direction: "out" as const, kind: "control" as const },
        ]
      : [
          { id: crypto.randomUUID() as UUID, name: "in", direction: "in" as const, kind: "control" as const },
          { id: crypto.randomUUID() as UUID, name: "out", direction: "out" as const, kind: "control" as const },
        ];
    return {
      id,
      kind,
      label,
      position: { x: pos.x - 100, y: pos.y - 40 },
      size: { width: 200, height: 80 },
      ports,
      config: {},
    };
  };

  const handleAdd = (kind: NodeModel["kind"], label: string) => {
    pushHistory(`Add ${kind}`);
    addNode(makeNode(kind, label));
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full">
      {/* Left Sidebar - Node Library */}
      <aside className="w-64 border-r bg-white/50 p-3">
        <h3 className="font-semibold mb-2">Node Library</h3>
        <div className="space-y-2 text-sm">
          <button className="w-full rounded border px-2 py-1" onClick={() => handleAdd("trigger", "Webhook Trigger")}>Trigger</button>
          <button className="w-full rounded border px-2 py-1" onClick={() => handleAdd("action", "HTTP Request")}>Action</button>
          <button className="w-full rounded border px-2 py-1" onClick={() => handleAdd("condition", "If/Else")}>Condition</button>
          <button className="w-full rounded border px-2 py-1" onClick={() => handleAdd("loop", "For Each")}>Loop</button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 relative bg-neutral-50">
        {/* Top Toolbar */}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded border bg-white/80 p-2 backdrop-blur">
          <button className="rounded border px-2 py-1" onClick={undo} title="Undo (⌘Z)">
            Undo
          </button>
          <button className="rounded border px-2 py-1" onClick={redo} title="Redo (⌘⇧Z)">
            Redo
          </button>
          <div className="mx-2 h-6 w-px bg-neutral-300" />
          <button className="rounded border px-2 py-1" onClick={() => zoomBy(1 / 1.1)}>
            -
          </button>
          <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button className="rounded border px-2 py-1" onClick={() => zoomBy(1.1)}>
            +
          </button>
        </div>

        {/* Canvas */}
        <Canvas />

        {/* Minimap */}
        <div className="absolute bottom-4 right-4 z-10">
          <Minimap />
        </div>
      </main>

      {/* Right Panel - Properties */}
      <aside className="w-80 border-l bg-white/50 p-3">
        <h3 className="font-semibold mb-2">Properties</h3>
        <div className="text-sm text-neutral-500">Select a node to edit properties.</div>
      </aside>

      {/* Bottom Panel placeholder - future logs/test/editor */}
    </div>
  );
}
