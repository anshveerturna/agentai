import { create } from "zustand";
import type { StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { produce, enableMapSet } from "immer";
import type {
  Edge,
  HistoryEntry,
  NodeModel,
  UUID,
  Viewport,
  Workflow,
  WorkflowState,
} from "@/types/workflow";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Enable Map/Set support for Immer (required because we mutate Sets in selection/history)
enableMapSet();

function uuid(): UUID {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const emptyWorkflow = (): Workflow => ({
  id: uuid(),
  name: "Untitled Workflow",
  nodes: [],
  edges: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

type Actions = {
  // history
  undo: () => void;
  redo: () => void;
  pushHistory: (desc?: string) => void;
  // viewport
  setViewport: (vp: Partial<Viewport>) => void;
  zoomBy: (delta: number, center?: { x: number; y: number }) => void;
  panBy: (dx: number, dy: number) => void;
  // selection
  clearSelection: () => void;
  selectNodes: (ids: UUID[], additive?: boolean) => void;
  selectEdges: (ids: UUID[], additive?: boolean) => void;
  // nodes
  addNode: (node: Partial<NodeModel>) => UUID;
  updateNode: (id: UUID, patch: Partial<NodeModel>) => void;
  moveNodes: (ids: UUID[], dx: number, dy: number, snap?: number) => void;
  removeNodes: (ids: UUID[]) => void;
  // edges
  addEdge: (edge: Omit<Edge, "id">) => UUID;
  removeEdges: (ids: UUID[]) => void;
  // connections (interactive)
  beginConnect: (from: { nodeId: UUID; portId: UUID; kind: Edge["kind"] }) => void;
  updateConnectCursor: (cursor: { x: number; y: number }) => void;
  completeConnect: (to: { nodeId: UUID; portId: UUID; kind: Edge["kind"] }) => void;
  cancelConnect: () => void;
};

export type WorkflowStore = WorkflowState & Actions;

const initialState: WorkflowState = {
  workflow: emptyWorkflow(),
  viewport: { zoom: 0.85, offset: { x: 0, y: 0 } },
  selection: { nodes: new Set(), edges: new Set() },
  history: [],
  redoStack: [],
};

const creator: StateCreator<
  WorkflowStore,
  [["zustand/devtools", never]],
  [],
  WorkflowStore
> = (set, get) => ({
  ...initialState,

  pushHistory: (description?: string) => {
    const { workflow, viewport, selection } = get();
    const snapshot: Omit<WorkflowState, "history" | "redoStack"> = {
      workflow: JSON.parse(JSON.stringify(workflow)) as Workflow,
      viewport: { ...viewport },
      selection: {
        nodes: new Set(Array.from(selection.nodes)),
        edges: new Set(Array.from(selection.edges)),
      },
    };
    set(
      produce<WorkflowStore>((draft: WorkflowStore) => {
        draft.history.push({ snapshot, description });
        draft.redoStack = [];
      })
    );
  },

  undo: () => {
      const { history } = get();
      if (history.length === 0) return;
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          const entry = draft.history.pop()!;
          const current: HistoryEntry = {
            snapshot: {
              workflow: draft.workflow,
              viewport: draft.viewport,
              selection: {
                nodes: new Set(Array.from(draft.selection.nodes)),
                edges: new Set(Array.from(draft.selection.edges)),
              },
            },
          };
          draft.redoStack.push(current);
          draft.workflow = entry.snapshot.workflow as Workflow;
          draft.viewport = entry.snapshot.viewport;
          draft.selection = {
            nodes: new Set(Array.from(entry.snapshot.selection.nodes)),
            edges: new Set(Array.from(entry.snapshot.selection.edges)),
          };
        })
      );
  },

  redo: () => {
      const { redoStack } = get();
      if (redoStack.length === 0) return;
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          const entry = draft.redoStack.pop()!;
          const current: HistoryEntry = {
            snapshot: {
              workflow: draft.workflow,
              viewport: draft.viewport,
              selection: {
                nodes: new Set(Array.from(draft.selection.nodes)),
                edges: new Set(Array.from(draft.selection.edges)),
              },
            },
          };
          draft.history.push(current);
          draft.workflow = entry.snapshot.workflow as Workflow;
          draft.viewport = entry.snapshot.viewport;
          draft.selection = {
            nodes: new Set(Array.from(entry.snapshot.selection.nodes)),
            edges: new Set(Array.from(entry.snapshot.selection.edges)),
          };
        })
      );
  },

    setViewport: (vp: Partial<Viewport>) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.viewport = { ...draft.viewport, ...vp };
        })
      ),

    zoomBy: (delta: number, center?: { x: number; y: number }) => {
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          const prevZoom = draft.viewport.zoom;
          const nextZoom = clamp(prevZoom * delta, 0.1, 5);
          if (center) {
            // keep the point under cursor stable
            const scale = nextZoom / prevZoom;
            draft.viewport.offset.x = center.x - scale * (center.x - draft.viewport.offset.x);
            draft.viewport.offset.y = center.y - scale * (center.y - draft.viewport.offset.y);
          }
          draft.viewport.zoom = nextZoom;
        })
      );
    },

    panBy: (dx: number, dy: number) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.viewport.offset.x += dx;
          draft.viewport.offset.y += dy;
        })
      ),

    clearSelection: () =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.selection.nodes.clear();
          draft.selection.edges.clear();
          draft.workflow.nodes.forEach((n: NodeModel) => (n.selected = false));
        })
      ),

    selectNodes: (ids: UUID[], additive?: boolean) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          if (!additive) {
            draft.selection.nodes.clear();
            draft.workflow.nodes.forEach((n: NodeModel) => (n.selected = false));
          }
          ids.forEach((id) => {
            draft.selection.nodes.add(id);
            const node = draft.workflow.nodes.find((n) => n.id === id);
            if (node) node.selected = true;
          });
        })
      ),

    selectEdges: (ids: UUID[], additive?: boolean) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          if (!additive) draft.selection.edges.clear();
          ids.forEach((id) => draft.selection.edges.add(id));
        })
      ),

  addNode: (node) => {
      const id = node.id ?? uuid();
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.workflow.nodes.push({
            id,
            kind: (node.kind ?? "action") as NodeModel["kind"],
            label: node.label ?? "Node",
            position: node.position ?? { x: 0, y: 0 },
            size: node.size ?? { width: 140, height: 32 },
            ports: node.ports ?? [],
            config: node.config ?? {},
          });
          draft.workflow.updatedAt = Date.now();
        })
      );
      return id;
  },

    updateNode: (id: UUID, patch: Partial<NodeModel>) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          const n = draft.workflow.nodes.find((x) => x.id === id);
          if (!n) return;
          Object.assign(n, patch);
          draft.workflow.updatedAt = Date.now();
        })
      ),

    moveNodes: (ids: UUID[], dx: number, dy: number, snap = 8) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.workflow.nodes.forEach((n) => {
            if (!ids.includes(n.id)) return;
            const nx = n.position.x + dx;
            const ny = n.position.y + dy;
            n.position.x = Math.round(nx / snap) * snap;
            n.position.y = Math.round(ny / snap) * snap;
          });
          draft.workflow.updatedAt = Date.now();
        })
      ),

    removeNodes: (ids: UUID[]) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.workflow.nodes = draft.workflow.nodes.filter((n) => !ids.includes(n.id));
          const idSet = new Set(ids);
          draft.workflow.edges = draft.workflow.edges.filter(
            (e) => !idSet.has(e.from.nodeId) && !idSet.has(e.to.nodeId)
          );
          draft.workflow.updatedAt = Date.now();
        })
      ),

    addEdge: (edge: Omit<Edge, "id">) => {
      const id = uuid();
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.workflow.edges.push({ id, ...edge });
          draft.workflow.updatedAt = Date.now();
        })
      );
      return id;
    },

    removeEdges: (ids: UUID[]) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          const setIds = new Set(ids);
          draft.workflow.edges = draft.workflow.edges.filter((e) => !setIds.has(e.id));
          draft.workflow.updatedAt = Date.now();
        })
      ),

  beginConnect: (from) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.connectionDraft = { from };
        })
      ),

  updateConnectCursor: (cursor) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          if (!draft.connectionDraft) return;
          draft.connectionDraft.cursor = cursor;
        })
      ),

  completeConnect: (to) =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          const d = draft.connectionDraft;
          if (!d || !d.from) return;
          // Only allow from output to input and same kind
          if (d.from.kind !== to.kind) {
            draft.connectionDraft = undefined;
            return;
          }
          const id = (Math.random().toString(36).slice(2) + Date.now().toString(36)) as UUID;
          draft.workflow.edges.push({
            id,
            from: { nodeId: d.from.nodeId, portId: d.from.portId },
            to: { nodeId: to.nodeId, portId: to.portId },
            kind: d.from.kind,
          });
          draft.workflow.updatedAt = Date.now();
          draft.connectionDraft = undefined;
        })
      ),

  cancelConnect: () =>
      set(
        produce<WorkflowStore>((draft: WorkflowStore) => {
          draft.connectionDraft = undefined;
        })
      ),
});

export const useWorkflowStore = create<WorkflowStore>()(devtools(creator));

// Persistence (simple localStorage). This is optional and safe in browser only.
if (typeof window !== "undefined") {
  const KEY = "workflow/local";
  const VERSION_KEY = "workflow/version";
  const CURRENT_VERSION = "4"; // Increment to force reset of defaults
  
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      // Clear old data when version changes
      localStorage.removeItem(KEY);
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } else {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        useWorkflowStore.setState((prev) => ({
          ...prev,
          workflow: {
            ...prev.workflow,
            ...parsed.workflow,
            // ensure sets are proper types
          },
          // Only restore viewport if it exists and has a reasonable zoom
          ...(parsed.viewport && parsed.viewport.zoom >= 0.1 && parsed.viewport.zoom <= 3 
            ? { viewport: parsed.viewport }
            : {})
        }));
      }
    }
  } catch {}

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  useWorkflowStore.subscribe((state) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const { workflow, viewport } = state;
        localStorage.setItem(KEY, JSON.stringify({ workflow, viewport }));
      } catch {}
    }, 300);
  });
}
