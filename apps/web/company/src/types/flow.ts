export type UUID = string;

export type Point = { x: number; y: number };

export type Size = { width: number; height: number };

export type Viewport = {
  zoom: number; // 0.1 - 5.0
  offset: Point; // canvas pan in px
};

export type PortDirection = "in" | "out";
export type PortKind = "data" | "control" | "error";

export type Port = {
  id: UUID;
  name: string;
  direction: PortDirection;
  kind: PortKind;
  dataType?: string; // optional schema/type id
  required?: boolean;
};

export type NodeKind =
  | "trigger"
  | "action" 
  | "condition"
  | "loop"
  | "delay"
  | "error-handler"
  | "sub-workflow"
  | "custom"
  | "webhook"
  | "schedule"
  | "event"
  | "ai-monitor"
  | "api-call"
  | "data-transform"
  | "ai-operation"
  | "logic-gate"
  | "ai-decision"
  | "data-validation"
  | "for-each"
  | "while"
  | "parallel"
  | "time-delay"
  | "event-delay"
  | "ai-delay"
  | "retry"
  | "fallback";

export type NodeModel = {
  id: UUID;
  kind: NodeKind;
  label: string;
  description?: string;
  position: Point; // top-left in canvas coords
  size: Size;
  ports: Port[];
  config?: Record<string, unknown>;
  selected?: boolean;
  category?: string;
  icon?: string;
  color?: string;
  status?: 'idle' | 'running' | 'success' | 'error' | 'warning';
};

export type EdgeModel = {
  id: UUID;
  from: { nodeId: UUID; portId: UUID };
  to: { nodeId: UUID; portId: UUID };
  kind: PortKind;
  label?: string;
  selected?: boolean;
  animated?: boolean;
  isDraft?: boolean;
};

export type WorkflowModel = {
  id: UUID;
  name: string;
  description?: string;
  nodes: NodeModel[];
  edges: EdgeModel[];
  createdAt: number;
  updatedAt: number;
  version: number;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  metadata?: Record<string, unknown>;
};

export type ConnectionDraft = {
  from?: { nodeId: UUID; portId: UUID; kind: PortKind };
  to?: { nodeId: UUID; portId: UUID; kind: PortKind };
  cursor?: Point; // in canvas coordinates
};

export type HistoryEntry = {
  timestamp: number;
  action: string;
  state: Omit<FlowState, "history" | "redoStack">;
  description?: string;
};

export type ExecutionLog = {
  id: UUID;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: UUID;
  data?: unknown;
};

export type TestCase = {
  id: UUID;
  name: string;
  description?: string;
  inputs: Record<string, unknown>;
  expectedOutputs: Record<string, unknown>;
  status?: 'pending' | 'running' | 'passed' | 'failed';
  result?: Record<string, unknown>;
  executionTime?: number;
};

export type FlowState = {
  // Core workflow data
  workflow: WorkflowModel;
  
  // Viewport and UI state  
  viewport: Viewport;
  // Event counter to request canvas fit-to-screen from UI
  fitRequests?: number;
  // UI preferences (persisted)
  ui?: {
    leftPanel: boolean;   // Node Library
    rightPanel: boolean;  // Properties
    bottomPanel: boolean; // Logs/Code panel
    focusMode: boolean;   // Hide all panels
  };
  
  // Selection state
  selectedNodes: UUID[];
  selectedEdges: UUID[];
  
  // Connection state
  connectionDraft?: ConnectionDraft;
  
  // History for undo/redo
  history: HistoryEntry[];
  redoStack: HistoryEntry[];
  
  // Execution state
  isExecuting: boolean;
  executionLogs: ExecutionLog[];
  
  // Testing state
  testCases: TestCase[];
  activeTest?: UUID;
  
  // Code editor state
  codeEditor?: {
    language: string;
    code: string;
    isOpen: boolean;
  };
};
