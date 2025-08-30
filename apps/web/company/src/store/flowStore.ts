import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { produce } from "immer";
import type { StateCreator } from "zustand";
import type {
  FlowState,
  NodeModel,
  EdgeModel,
  UUID,
  Viewport,
  Point,
  HistoryEntry,
  ExecutionLog,
  TestCase,
  ConnectionDraft
} from "@/types/flow";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function uuid(): UUID {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const createEmptyWorkflow = () => {
  // Deterministic, stable IDs to avoid SSR/client hydration mismatches
  const webhookTriggerId = "node-webhook";
  const aiAnalysisId = "node-ai-analysis";
  const qualityCheckId = "node-quality-check";

  const triggerOutputPortId = "port-webhook-output";
  const aiInputPortId = "port-ai-input";
  const aiOutputPortId = "port-ai-output";
  const qualityInputPortId = "port-quality-input";

  return {
    id: "workflow-default",
    name: "Untitled Flow",
    description: "",
    nodes: [
      {
        id: webhookTriggerId,
        kind: "trigger" as const,
        label: "Webhook",
        description: "HTTP webhook trigger",
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        ports: [
          {
            id: triggerOutputPortId,
            name: "Output",
            direction: "out" as const,
            kind: "data" as const
          }
        ],
        config: {
          url: "/webhook/example",
          method: "POST"
        }
      },
      {
        id: aiAnalysisId,
        kind: "ai-operation" as const,
        label: "AI Analysis",
        description: "Analyze incoming data with AI",
        position: { x: 400, y: 100 },
        size: { width: 200, height: 100 },
        ports: [
          {
            id: aiInputPortId,
            name: "Input",
            direction: "in" as const,
            kind: "data" as const
          },
          {
            id: aiOutputPortId,
            name: "Output",
            direction: "out" as const,
            kind: "data" as const
          }
        ],
        config: {
          model: "gpt-4",
          prompt: "Analyze the incoming data"
        }
      },
      {
        id: qualityCheckId,
        kind: "condition" as const,
        label: "Quality Check",
        description: "Check if analysis meets criteria",
        position: { x: 700, y: 100 },
        size: { width: 200, height: 100 },
        ports: [
          {
            id: qualityInputPortId,
            name: "Input",
            direction: "in" as const,
            kind: "data" as const
          },
          {
            id: "port-quality-success",
            name: "Success",
            direction: "out" as const,
            kind: "control" as const
          },
          {
            id: "port-quality-failure",
            name: "Failure",
            direction: "out" as const,
            kind: "error" as const
          }
        ],
        config: {
          condition: "confidence > 0.8"
        }
      }
    ],
    edges: [
      {
        id: "edge-webhook-to-ai",
        from: {
          nodeId: webhookTriggerId,
          portId: triggerOutputPortId
        },
        to: {
          nodeId: aiAnalysisId,
          portId: aiInputPortId
        },
        kind: "data" as const,
        animated: false,
        label: ""
      },
      {
        id: "edge-ai-to-quality",
        from: {
          nodeId: aiAnalysisId,
          portId: aiOutputPortId
        },
        to: {
          nodeId: qualityCheckId,
          portId: qualityInputPortId
        },
        kind: "data" as const,
        animated: false,
        label: ""
      }
    ],
    createdAt: 0,
    updatedAt: 0,
    version: 1,
    status: 'draft' as const,
    metadata: {}
  };
};

type FlowActions = {
  // Viewport actions
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number, center?: Point) => void;
  zoomTo: (zoom: number) => void;
  zoomToFit: () => void;
  resetZoom: () => void;
  
  // Selection actions
  setSelection: (nodeIds: UUID[], edgeIds: UUID[]) => void;
  clearSelection: () => void;
  selectNode: (nodeId: UUID, additive?: boolean) => void;
  selectEdge: (edgeId: UUID, additive?: boolean) => void;
  
  // Node actions
  addNode: (node: Partial<NodeModel>) => UUID;
  updateNode: (nodeId: UUID, updates: Partial<NodeModel>) => void;
  deleteNode: (nodeId: UUID) => void;
  deleteNodes: (nodeIds: UUID[]) => void;
  moveNodes: (nodeIds: UUID[], dx: number, dy: number) => void;
  duplicateNodes: (nodeIds: UUID[]) => UUID[];
  
  // Edge actions
  addEdge: (edge: Omit<EdgeModel, "id">) => UUID;
  updateEdge: (edgeId: UUID, updates: Partial<EdgeModel>) => void;
  deleteEdge: (edgeId: UUID) => void;
  deleteEdges: (edgeIds: UUID[]) => void;
  
  // Connection actions
  beginConnection: (from: { nodeId: UUID; portId: UUID; kind: EdgeModel["kind"] }) => void;
  updateConnectionCursor: (cursor: Point) => void;
  completeConnection: (to: { nodeId: UUID; portId: UUID; kind: EdgeModel["kind"] }) => void;
  cancelConnection: () => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  pushHistory: (action: string, description?: string) => void;
  
  // Workflow actions
  saveWorkflow: () => void;
  loadWorkflow: (workflow: FlowState["workflow"]) => void;
  exportWorkflow: () => string;
  importWorkflow: (data: string) => void;
  
  // Execution actions
  executeWorkflow: () => void;
  stopExecution: () => void;
  addExecutionLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => void;
  clearExecutionLogs: () => void;
  
  // Testing actions
  addTestCase: (testCase: Omit<TestCase, "id">) => UUID;
  updateTestCase: (testCaseId: UUID, updates: Partial<TestCase>) => void;
  deleteTestCase: (testCaseId: UUID) => void;
  runTestCase: (testCaseId: UUID) => void;
  runAllTests: () => void;
  
  // Code editor actions
  openCodeEditor: (language: string, code?: string) => void;
  closeCodeEditor: () => void;
  updateCode: (code: string) => void;

  // UI preferences
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  setFocusMode: (enabled: boolean) => void;
};

export type FlowStore = FlowState & FlowActions;

const initialState: FlowState = {
  workflow: createEmptyWorkflow(),
  viewport: { zoom: 1, offset: { x: 0, y: 0 } },
  fitRequests: 0,
  ui: { leftPanel: true, rightPanel: true, bottomPanel: false, focusMode: false },
  selectedNodes: [],
  selectedEdges: [],
  history: [],
  redoStack: [],
  isExecuting: false,
  executionLogs: [],
  testCases: []
};

const creator: StateCreator<
  FlowStore,
  [["zustand/devtools", never]],
  [],
  FlowStore
> = (set, get) => ({
  ...initialState,

  // Viewport actions
  panBy: (dx: number, dy: number) => {
    set(
      produce<FlowStore>((draft) => {
        draft.viewport.offset.x += dx;
        draft.viewport.offset.y += dy;
      })
    );
  },

  zoomBy: (factor: number, center?: Point) => {
    set(
      produce<FlowStore>((draft) => {
        const prevZoom = draft.viewport.zoom;
        const nextZoom = clamp(prevZoom * factor, 0.1, 5);
        
        if (center) {
          const scale = nextZoom / prevZoom;
          draft.viewport.offset.x = center.x - scale * (center.x - draft.viewport.offset.x);
          draft.viewport.offset.y = center.y - scale * (center.y - draft.viewport.offset.y);
        }
        
        draft.viewport.zoom = nextZoom;
      })
    );
  },

  zoomTo: (zoom: number) => {
    set(
      produce<FlowStore>((draft) => {
        draft.viewport.zoom = clamp(zoom, 0.1, 5);
      })
    );
  },

  zoomToFit: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.fitRequests = (draft.fitRequests ?? 0) + 1;
      })
    );
  },

  resetZoom: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.viewport.zoom = 1;
        draft.viewport.offset = { x: 0, y: 0 };
      })
    );
  },

  // Selection actions
  setSelection: (nodeIds: UUID[], edgeIds: UUID[]) => {
    set(
      produce<FlowStore>((draft) => {
        draft.selectedNodes = nodeIds;
        draft.selectedEdges = edgeIds;
        
        // Update node selection state
        draft.workflow.nodes.forEach(node => {
          node.selected = nodeIds.includes(node.id);
        });
        
        // Update edge selection state
        draft.workflow.edges.forEach(edge => {
          edge.selected = edgeIds.includes(edge.id);
        });
      })
    );
  },

  clearSelection: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.selectedNodes = [];
        draft.selectedEdges = [];
        
        draft.workflow.nodes.forEach(node => {
          node.selected = false;
        });
        
        draft.workflow.edges.forEach(edge => {
          edge.selected = false;
        });
      })
    );
  },

  selectNode: (nodeId: UUID, additive = false) => {
    set(
      produce<FlowStore>((draft) => {
        if (!additive) {
          draft.selectedNodes = [nodeId];
          draft.selectedEdges = [];
          
          draft.workflow.nodes.forEach(node => {
            node.selected = node.id === nodeId;
          });
          
          draft.workflow.edges.forEach(edge => {
            edge.selected = false;
          });
        } else {
          if (draft.selectedNodes.includes(nodeId)) {
            draft.selectedNodes = draft.selectedNodes.filter(id => id !== nodeId);
          } else {
            draft.selectedNodes.push(nodeId);
          }
          
          const node = draft.workflow.nodes.find(n => n.id === nodeId);
          if (node) {
            node.selected = draft.selectedNodes.includes(nodeId);
          }
        }
      })
    );
  },

  selectEdge: (edgeId: UUID, additive = false) => {
    set(
      produce<FlowStore>((draft) => {
        if (!additive) {
          draft.selectedEdges = [edgeId];
          draft.selectedNodes = [];
          
          draft.workflow.edges.forEach(edge => {
            edge.selected = edge.id === edgeId;
          });
          
          draft.workflow.nodes.forEach(node => {
            node.selected = false;
          });
        } else {
          if (draft.selectedEdges.includes(edgeId)) {
            draft.selectedEdges = draft.selectedEdges.filter(id => id !== edgeId);
          } else {
            draft.selectedEdges.push(edgeId);
          }
          
          const edge = draft.workflow.edges.find(e => e.id === edgeId);
          if (edge) {
            edge.selected = draft.selectedEdges.includes(edgeId);
          }
        }
      })
    );
  },

  // Node actions
  addNode: (node: Partial<NodeModel>) => {
    const id = node.id ?? uuid();
    
    set(
      produce<FlowStore>((draft) => {
        const newNode: NodeModel = {
          id,
          kind: node.kind ?? "action",
          label: node.label ?? "New Node",
          position: node.position ?? { x: 0, y: 0 },
          size: node.size ?? { width: 200, height: 100 },
          ports: node.ports ?? [],
          config: node.config ?? {},
          ...node
        };
        
        draft.workflow.nodes.push(newNode);
        draft.workflow.updatedAt = Date.now();
      })
    );
    
    return id;
  },

  updateNode: (nodeId: UUID, updates: Partial<NodeModel>) => {
    set(
      produce<FlowStore>((draft) => {
        const node = draft.workflow.nodes.find(n => n.id === nodeId);
        if (node) {
          Object.assign(node, updates);
          draft.workflow.updatedAt = Date.now();
        }
      })
    );
  },

  deleteNode: (nodeId: UUID) => {
    set(
      produce<FlowStore>((draft) => {
        draft.workflow.nodes = draft.workflow.nodes.filter(n => n.id !== nodeId);
        draft.workflow.edges = draft.workflow.edges.filter(
          e => e.from.nodeId !== nodeId && e.to.nodeId !== nodeId
        );
        draft.selectedNodes = draft.selectedNodes.filter(id => id !== nodeId);
        draft.workflow.updatedAt = Date.now();
      })
    );
  },

  deleteNodes: (nodeIds: UUID[]) => {
    set(
      produce<FlowStore>((draft) => {
        const nodeIdSet = new Set(nodeIds);
        draft.workflow.nodes = draft.workflow.nodes.filter(n => !nodeIdSet.has(n.id));
        draft.workflow.edges = draft.workflow.edges.filter(
          e => !nodeIdSet.has(e.from.nodeId) && !nodeIdSet.has(e.to.nodeId)
        );
        draft.selectedNodes = draft.selectedNodes.filter(id => !nodeIdSet.has(id));
        draft.workflow.updatedAt = Date.now();
      })
    );
  },

  moveNodes: (nodeIds: UUID[], dx: number, dy: number) => {
    set(
      produce<FlowStore>((draft) => {
        const nodeIdSet = new Set(nodeIds);
        draft.workflow.nodes.forEach(node => {
          if (nodeIdSet.has(node.id)) {
            node.position.x += dx;
            node.position.y += dy;
            
            // Snap to grid
            const gridSize = 20;
            node.position.x = Math.round(node.position.x / gridSize) * gridSize;
            node.position.y = Math.round(node.position.y / gridSize) * gridSize;
          }
        });
        draft.workflow.updatedAt = Date.now();
      })
    );
  },

  duplicateNodes: (nodeIds: UUID[]) => {
    const newNodeIds: UUID[] = [];
    
    set(
      produce<FlowStore>((draft) => {
        const nodeIdSet = new Set(nodeIds);
        const nodesToDuplicate = draft.workflow.nodes.filter(n => nodeIdSet.has(n.id));
        
        nodesToDuplicate.forEach(node => {
          const newId = uuid();
          newNodeIds.push(newId);
          
          const newNode: NodeModel = {
            ...node,
            id: newId,
            label: `${node.label} (Copy)`,
            position: {
              x: node.position.x + 50,
              y: node.position.y + 50
            },
            selected: false
          };
          
          draft.workflow.nodes.push(newNode);
        });
        
        draft.workflow.updatedAt = Date.now();
      })
    );
    
    return newNodeIds;
  },

  // Edge actions
  addEdge: (edge: Omit<EdgeModel, "id">) => {
    const id = uuid();
    
    set(
      produce<FlowStore>((draft) => {
        const newEdge: EdgeModel = {
          id,
          ...edge
        };
        
        draft.workflow.edges.push(newEdge);
        draft.workflow.updatedAt = Date.now();
      })
    );
    
    return id;
  },

  updateEdge: (edgeId: UUID, updates: Partial<EdgeModel>) => {
    set(
      produce<FlowStore>((draft) => {
        const edge = draft.workflow.edges.find(e => e.id === edgeId);
        if (edge) {
          Object.assign(edge, updates);
          draft.workflow.updatedAt = Date.now();
        }
      })
    );
  },

  deleteEdge: (edgeId: UUID) => {
    set(
      produce<FlowStore>((draft) => {
        draft.workflow.edges = draft.workflow.edges.filter(e => e.id !== edgeId);
        draft.selectedEdges = draft.selectedEdges.filter(id => id !== edgeId);
        draft.workflow.updatedAt = Date.now();
      })
    );
  },

  deleteEdges: (edgeIds: UUID[]) => {
    set(
      produce<FlowStore>((draft) => {
        const edgeIdSet = new Set(edgeIds);
        draft.workflow.edges = draft.workflow.edges.filter(e => !edgeIdSet.has(e.id));
        draft.selectedEdges = draft.selectedEdges.filter(id => !edgeIdSet.has(id));
        draft.workflow.updatedAt = Date.now();
      })
    );
  },

  // Connection actions
  beginConnection: (from) => {
    set(
      produce<FlowStore>((draft) => {
        draft.connectionDraft = { from };
      })
    );
  },

  updateConnectionCursor: (cursor: Point) => {
    set(
      produce<FlowStore>((draft) => {
        if (draft.connectionDraft) {
          draft.connectionDraft.cursor = cursor;
        }
      })
    );
  },

  completeConnection: (to) => {
    const { connectionDraft } = get();
    
    if (!connectionDraft?.from) return;
    
    // Validate connection
    if (connectionDraft.from.kind !== to.kind) return;
    if (connectionDraft.from.nodeId === to.nodeId) return;
    
    set(
      produce<FlowStore>((draft) => {
        const edgeId = uuid();
        
        draft.workflow.edges.push({
          id: edgeId,
          from: connectionDraft.from!,
          to,
          kind: connectionDraft.from!.kind
        });
        
        draft.connectionDraft = undefined;
        draft.workflow.updatedAt = Date.now();
      })
    );
  },

  cancelConnection: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.connectionDraft = undefined;
      })
    );
  },

  // History actions
  pushHistory: (action: string, description?: string) => {
    const { workflow, viewport, selectedNodes, selectedEdges } = get();
    
    set(
      produce<FlowStore>((draft) => {
        const entry: HistoryEntry = {
          timestamp: Date.now(),
          action,
          description,
          state: {
            workflow: JSON.parse(JSON.stringify(workflow)),
            viewport: { ...viewport },
            selectedNodes: [...selectedNodes],
            selectedEdges: [...selectedEdges],
            isExecuting: false,
            executionLogs: [],
            testCases: []
          }
        };
        
        draft.history.push(entry);
        draft.redoStack = [];
        
        // Limit history size
        if (draft.history.length > 50) {
          draft.history = draft.history.slice(-50);
        }
      })
    );
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    
    set(
      produce<FlowStore>((draft) => {
        const entry = draft.history.pop()!;
        
        // Save current state to redo stack
        const currentState: HistoryEntry = {
          timestamp: Date.now(),
          action: "redo_point",
          state: {
            workflow: draft.workflow,
            viewport: draft.viewport,
            selectedNodes: draft.selectedNodes,
            selectedEdges: draft.selectedEdges,
            isExecuting: draft.isExecuting,
            executionLogs: draft.executionLogs,
            testCases: draft.testCases
          }
        };
        
        draft.redoStack.push(currentState);
        
        // Restore previous state
        draft.workflow = entry.state.workflow;
        draft.viewport = entry.state.viewport;
        draft.selectedNodes = entry.state.selectedNodes;
        draft.selectedEdges = entry.state.selectedEdges;
      })
    );
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    
    set(
      produce<FlowStore>((draft) => {
        const entry = draft.redoStack.pop()!;
        
        // Save current state to history
        const currentState: HistoryEntry = {
          timestamp: Date.now(),
          action: "undo_point",
          state: {
            workflow: draft.workflow,
            viewport: draft.viewport,
            selectedNodes: draft.selectedNodes,
            selectedEdges: draft.selectedEdges,
            isExecuting: draft.isExecuting,
            executionLogs: draft.executionLogs,
            testCases: draft.testCases
          }
        };
        
        draft.history.push(currentState);
        
        // Restore state
        draft.workflow = entry.state.workflow;
        draft.viewport = entry.state.viewport;
        draft.selectedNodes = entry.state.selectedNodes;
        draft.selectedEdges = entry.state.selectedEdges;
      })
    );
  },

  // Workflow actions
  saveWorkflow: () => {
    const { workflow } = get();
    
    // Save to localStorage for now
    try {
      localStorage.setItem(`flow-${workflow.id}`, JSON.stringify(workflow));
    } catch (error) {
      console.error("Failed to save workflow:", error);
    }
  },

  loadWorkflow: (workflow) => {
    set(
      produce<FlowStore>((draft) => {
        draft.workflow = workflow;
        draft.selectedNodes = [];
        draft.selectedEdges = [];
        draft.history = [];
        draft.redoStack = [];
      })
    );
  },

  exportWorkflow: () => {
    const { workflow } = get();
    return JSON.stringify(workflow, null, 2);
  },

  importWorkflow: (data: string) => {
    try {
      const workflow = JSON.parse(data);
      get().loadWorkflow(workflow);
    } catch (error) {
      console.error("Failed to import workflow:", error);
    }
  },

  // Execution actions
  executeWorkflow: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.isExecuting = true;
        draft.executionLogs = [];
      })
    );
    
    // Simulate execution
    setTimeout(() => {
      get().addExecutionLog({
        level: "info",
        message: "Workflow execution started"
      });
      
      setTimeout(() => {
        get().addExecutionLog({
          level: "info", 
          message: "Workflow execution completed"
        });
        
        set(
          produce<FlowStore>((draft) => {
            draft.isExecuting = false;
          })
        );
      }, 2000);
    }, 100);
  },

  stopExecution: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.isExecuting = false;
      })
    );
    
    get().addExecutionLog({
      level: "warn",
      message: "Workflow execution stopped by user"
    });
  },

  addExecutionLog: (log) => {
    set(
      produce<FlowStore>((draft) => {
        const newLog: ExecutionLog = {
          id: uuid(),
          timestamp: Date.now(),
          ...log
        };
        
        draft.executionLogs.push(newLog);
        
        // Limit log size
        if (draft.executionLogs.length > 1000) {
          draft.executionLogs = draft.executionLogs.slice(-1000);
        }
      })
    );
  },

  clearExecutionLogs: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.executionLogs = [];
      })
    );
  },

  // Testing actions
  addTestCase: (testCase) => {
    const id = uuid();
    
    set(
      produce<FlowStore>((draft) => {
        const newTestCase: TestCase = {
          id,
          ...testCase
        };
        
        draft.testCases.push(newTestCase);
      })
    );
    
    return id;
  },

  updateTestCase: (testCaseId, updates) => {
    set(
      produce<FlowStore>((draft) => {
        const testCase = draft.testCases.find(tc => tc.id === testCaseId);
        if (testCase) {
          Object.assign(testCase, updates);
        }
      })
    );
  },

  deleteTestCase: (testCaseId) => {
    set(
      produce<FlowStore>((draft) => {
        draft.testCases = draft.testCases.filter(tc => tc.id !== testCaseId);
      })
    );
  },

  runTestCase: (testCaseId) => {
    // Implementation for running individual test case
    console.log("Running test case:", testCaseId);
  },

  runAllTests: () => {
    // Implementation for running all test cases
    console.log("Running all tests");
  },

  // Code editor actions
  openCodeEditor: (language, code = "") => {
    set(
      produce<FlowStore>((draft) => {
        draft.codeEditor = {
          language,
          code,
          isOpen: true
        };
      })
    );
  },

  closeCodeEditor: () => {
    set(
      produce<FlowStore>((draft) => {
        if (draft.codeEditor) {
          draft.codeEditor.isOpen = false;
        }
      })
    );
  },

  updateCode: (code) => {
    set(
      produce<FlowStore>((draft) => {
        if (draft.codeEditor) {
          draft.codeEditor.code = code;
        }
      })
    );
  },

  // UI preferences
  toggleLeftPanel: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.ui = draft.ui ?? { leftPanel: true, rightPanel: true, bottomPanel: false, focusMode: false };
        draft.ui.leftPanel = !draft.ui.leftPanel;
      })
    );
  },
  toggleRightPanel: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.ui = draft.ui ?? { leftPanel: true, rightPanel: true, bottomPanel: false, focusMode: false };
        draft.ui.rightPanel = !draft.ui.rightPanel;
      })
    );
  },
  toggleBottomPanel: () => {
    set(
      produce<FlowStore>((draft) => {
        draft.ui = draft.ui ?? { leftPanel: true, rightPanel: true, bottomPanel: false, focusMode: false };
        draft.ui.bottomPanel = !draft.ui.bottomPanel;
      })
    );
  },
  setFocusMode: (enabled: boolean) => {
    set(
      produce<FlowStore>((draft) => {
        draft.ui = draft.ui ?? { leftPanel: true, rightPanel: true, bottomPanel: false, focusMode: false };
        draft.ui.focusMode = enabled;
      })
    );
  }
});

export const useFlowStore = create<FlowStore>()(devtools(creator));

// Persistence
if (typeof window !== "undefined") {
  const STORAGE_KEY = "flow-builder-state";
  
  // Load persisted state on startup
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      // Defer restoration until after initial hydration to avoid SSR/CSR mismatch
      const restore = () => useFlowStore.setState(state);
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => restore());
      } else {
        setTimeout(() => restore(), 0);
      }
    }
  } catch (error) {
    console.warn("Failed to load persisted state:", error);
  }
  
  // Auto-save state changes
  let saveTimeout: ReturnType<typeof setTimeout>;
  useFlowStore.subscribe((state) => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        const { workflow, viewport, ui, fitRequests } = state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
          workflow, 
          viewport,
          ui,
          fitRequests,
          // Don't persist UI state like selections, logs, etc.
        }));
      } catch (error) {
        console.warn("Failed to persist state:", error);
      }
    }, 1000);
  });
}
