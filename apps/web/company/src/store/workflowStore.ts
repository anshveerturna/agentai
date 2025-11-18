import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { produce, enableMapSet } from 'immer';
import type { StateCreator } from 'zustand';
import type { Workflow, NodeModel, Edge, UUID, Viewport } from '@/types/workflow';

// UUID helper
const uuid = (): UUID => (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
  ? crypto.randomUUID()
  : (Math.random().toString(36).slice(2) + Date.now().toString(36));

const emptyWorkflow = (): Workflow => ({
  id: uuid(),
  name: 'Untitled Workflow',
  nodes: [],
  edges: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export type WorkflowStore = {
  workflow: Workflow;
  viewport: Viewport;
  selection: { nodes: Set<UUID>; edges: Set<UUID> };
  // Node ops
  addNode: (node: Partial<NodeModel>) => UUID;
  updateNode: (id: UUID, patch: Partial<NodeModel>) => void;
  moveNodes: (ids: UUID[], dx: number, dy: number, snap?: number) => void;
  removeNodes: (ids: UUID[]) => void;
  groupNodes: (ids: UUID[], options?: { label?: string; padding?: { top: number; right: number; bottom: number; left: number } }) => UUID | null;
  recalculateGroupBounds: () => void;
  // Edge ops
  addEdge: (edge: { from: { nodeId: UUID; portId: UUID }; to: { nodeId: UUID; portId: UUID }; kind: Edge['kind'] }) => UUID;
  removeEdges: (ids: UUID[]) => void;
  // Selection ops
  selectNodes: (ids: UUID[], additive?: boolean) => void;
  selectEdges: (ids: UUID[], additive?: boolean) => void;
  clearSelection: () => void;
  // Viewport ops
  setViewport: (vp: Viewport) => void;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  // Workflow level
  setWorkflow: (wf: Workflow) => void;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Enable Map/Set support for Immer (required because we mutate Sets in selection)
enableMapSet();

const creator: StateCreator<WorkflowStore, [["zustand/devtools", never]], [], WorkflowStore> = (set, get) => ({
  workflow: emptyWorkflow(),
  viewport: { zoom: 1, offset: { x: 0, y: 0 } },
  selection: { nodes: new Set<UUID>(), edges: new Set<UUID>() },

  setWorkflow: (wf) => set(produce<WorkflowStore>((draft) => { draft.workflow = wf; })),

  addNode: (node) => {
    const id = node.id ?? uuid();
    set(produce<WorkflowStore>((draft) => {
      draft.workflow.nodes.push({
        id,
        kind: (node.kind ?? 'action') as NodeModel['kind'],
        label: node.label ?? 'Node',
        position: node.position ?? { x: 0, y: 0 },
        size: node.size ?? { width: 220, height: 80 },
        ports: node.ports ?? [],
        config: node.config ?? {},
      });
      draft.workflow.updatedAt = Date.now();
    }));
    return id;
  },

  updateNode: (id, patch) => {
    set(produce<WorkflowStore>((draft) => {
      const n = draft.workflow.nodes.find((x) => x.id === id);
      if (!n) return; Object.assign(n, patch); draft.workflow.updatedAt = Date.now();
    }));
  },

  moveNodes: (ids, dx, dy, snap = 8) => {
    set(produce<WorkflowStore>((draft) => {
      draft.workflow.nodes.forEach((n) => {
        if (!ids.includes(n.id)) return;
        const nx = n.position.x + dx; const ny = n.position.y + dy;
        n.position.x = Math.round(nx / snap) * snap; n.position.y = Math.round(ny / snap) * snap;
      });
      draft.workflow.updatedAt = Date.now();
    }));
  },

  removeNodes: (ids) => {
    set(produce<WorkflowStore>((draft) => {
      const toRemove = new Set(ids);
      const groups = draft.workflow.nodes.filter((n: any) => n.config?.nodeType === 'group');

      // Update each group's child list, mark groups with <=1 children for deletion
      for (const g of groups) {
        const childIds: string[] = Array.isArray(g.config?.childIds) ? g.config.childIds : [];
          const remaining = childIds.filter((cid) => !toRemove.has(cid)); 
        if (remaining.length !== childIds.length) {
          if (!g.config) (g as any).config = {};
          (g.config as any).childIds = remaining;
          (g.config as any).childCount = remaining.length;
        }
        if (remaining.length <= 1) {
          toRemove.add(g.id); // delete group itself
          continue;
        }
      }

      // Recompute bounds for surviving groups (>=2 children) after removals
      for (const g of groups) {
        if (toRemove.has(g.id)) continue; // will be deleted
        const childIds: string[] = Array.isArray(g.config?.childIds) ? g.config.childIds : [];
          if (childIds.length < 2) continue; // skip (either deleting or not enough children)
          const cfgPad: any = (g.config && (g.config as any).padding) ? (g.config as any).padding : {};
          const padding = {
            top: typeof cfgPad.top === 'number' ? cfgPad.top : 48,
            right: typeof cfgPad.right === 'number' ? cfgPad.right : 24,
            bottom: typeof cfgPad.bottom === 'number' ? cfgPad.bottom : 32,
            left: typeof cfgPad.left === 'number' ? cfgPad.left : 24,
          };
          const childNodes = childIds.map((cid) => draft.workflow.nodes.find((n) => n.id === cid)).filter(Boolean) as any[];
          if (!childNodes.length) continue;
          const minX = Math.min(...childNodes.map((n) => n.position.x)) - padding.left;
          const minY = Math.min(...childNodes.map((n) => n.position.y)) - padding.top;
          const maxX = Math.max(...childNodes.map((n) => n.position.x + (n.size?.width || 220))) + padding.right;
          const maxY = Math.max(...childNodes.map((n) => n.position.y + (n.size?.height || 100))) + padding.bottom;
          g.position.x = minX;
          g.position.y = minY;
          g.size = { width: maxX - minX, height: maxY - minY };
      }

      // Remove nodes & affected edges
      draft.workflow.nodes = draft.workflow.nodes.filter((n) => !toRemove.has(n.id));
      draft.workflow.edges = draft.workflow.edges.filter((e) => !toRemove.has(e.from.nodeId) && !toRemove.has(e.to.nodeId));
      toRemove.forEach((id) => draft.selection.nodes.delete(id));
      draft.workflow.updatedAt = Date.now();
    }));
  },

  groupNodes: (ids, options) => {
    const state = get();
    const wf = state.workflow;
    const targetNodes = wf.nodes.filter(n => ids.includes(n.id) && (n as any).config?.nodeType !== 'group');
    if (targetNodes.length < 2) return null;
    // Compute bounds
    const padding = options?.padding || { top: 48, right: 24, bottom: 32, left: 24 };
    const minX = Math.min(...targetNodes.map(n => n.position.x)) - padding.left;
    const minY = Math.min(...targetNodes.map(n => n.position.y)) - padding.top;
    const maxX = Math.max(...targetNodes.map(n => n.position.x + (n.size?.width || 220))) + padding.right;
    const maxY = Math.max(...targetNodes.map(n => n.position.y + (n.size?.height || 100))) + padding.bottom;
    const width = maxX - minX;
    const height = maxY - minY;
    const groupId = uuid();
    set(produce<WorkflowStore>((draft) => {
      draft.workflow.nodes.push({
        id: groupId,
        kind: 'custom',
        label: options?.label || 'Group',
        position: { x: minX, y: minY },
        size: { width, height },
        ports: [],
        config: {
          nodeType: 'group',
          padding,
          childIds: targetNodes.map(n => n.id),
          childCount: targetNodes.length,
        },
      } as any);
      // Mark children as selected? Keep their selected state but selection should switch to group only
      draft.selection.nodes.clear();
      draft.selection.nodes.add(groupId);
      draft.workflow.nodes.forEach(n => { n.selected = n.id === groupId; });
      draft.workflow.updatedAt = Date.now();
    }));
    return groupId;
  },

  recalculateGroupBounds: () => {
    set(produce<WorkflowStore>((draft) => {
      const groups = draft.workflow.nodes.filter((n: any) => n.config?.nodeType === 'group');
      
      groups.forEach((g: any) => {
        const childIds: string[] = Array.isArray(g.config?.childIds) ? g.config.childIds : [];
        if (childIds.length < 2) return;
        
        const padding = g.config?.padding || { top: 48, right: 24, bottom: 32, left: 24 };
        const childNodes = childIds
          .map((cid) => draft.workflow.nodes.find((n) => n.id === cid))
          .filter(Boolean) as any[];
        
        if (!childNodes.length) return;
        
        const minX = Math.min(...childNodes.map((n) => n.position.x)) - padding.left;
        const minY = Math.min(...childNodes.map((n) => n.position.y)) - padding.top;
        const maxX = Math.max(...childNodes.map((n) => n.position.x + (n.size?.width || 220))) + padding.right;
        const maxY = Math.max(...childNodes.map((n) => n.position.y + (n.size?.height || 100))) + padding.bottom;
        
        g.position.x = minX;
        g.position.y = minY;
        g.size = { width: maxX - minX, height: maxY - minY };
      });
    }));
  },

  addEdge: (edge) => {
    const id = uuid();
    set(produce<WorkflowStore>((draft) => { draft.workflow.edges.push({ id, ...edge }); draft.workflow.updatedAt = Date.now(); }));
    return id;
  },

  removeEdges: (ids) => {
    set(produce<WorkflowStore>((draft) => {
      const setIds = new Set(ids);
      draft.workflow.edges = draft.workflow.edges.filter((e) => !setIds.has(e.id));
      ids.forEach((id) => draft.selection.edges.delete(id));
      draft.workflow.updatedAt = Date.now();
    }));
  },

  selectNodes: (ids, additive = false) => {
    set(produce<WorkflowStore>((draft) => {
      if (!additive) { draft.selection.nodes.clear(); draft.workflow.nodes.forEach((n) => (n.selected = false)); }
      ids.forEach((id) => { draft.selection.nodes.add(id); const n = draft.workflow.nodes.find((x) => x.id === id); if (n) n.selected = true; });
    }));
  },

  selectEdges: (ids, additive = false) => {
    set(produce<WorkflowStore>((draft) => {
      if (!additive) { draft.selection.edges.clear(); draft.workflow.edges.forEach((e) => (e as any).selected = false); }
      ids.forEach((id) => { draft.selection.edges.add(id); const e = draft.workflow.edges.find((x) => x.id === id); if (e) (e as any).selected = true; });
    }));
  },

  clearSelection: () => {
    set(produce<WorkflowStore>((draft) => {
      draft.selection.nodes.clear(); draft.selection.edges.clear();
      draft.workflow.nodes.forEach((n) => (n.selected = false));
      draft.workflow.edges.forEach((e) => (e as any).selected = false);
    }));
  },

  setViewport: (vp) => set(produce<WorkflowStore>((draft) => { draft.viewport = vp; })),
  panBy: (dx, dy) => set(produce<WorkflowStore>((draft) => { draft.viewport.offset.x += dx; draft.viewport.offset.y += dy; })),
  zoomBy: (factor) => set(produce<WorkflowStore>((draft) => { const prev = draft.viewport.zoom; draft.viewport.zoom = clamp(prev * factor, 0.1, 5); })),
});

export const useWorkflowStore = create<WorkflowStore>()(devtools(creator));
