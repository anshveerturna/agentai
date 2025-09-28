// (intentionally left blank header — original workflow type definitions start below)
export type UUID = string;

export type Point = { x: number; y: number };

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
};

export type NodeKind =
  | "trigger"
  | "action"
  | "condition"
  | "loop"
  | "delay"
  | "error-handler"
  | "sub-workflow"
  | "custom";

export type NodeModel = {
  id: UUID;
  kind: NodeKind;
  label: string;
  position: Point; // top-left in canvas coords
  size: { width: number; height: number };
  ports: Port[];
  config?: Record<string, unknown>;
  selected?: boolean;
};

export type Edge = {
  id: UUID;
  from: { nodeId: UUID; portId: UUID };
  to: { nodeId: UUID; portId: UUID };
  kind: PortKind;
  label?: string;
};

export type Workflow = {
  id: UUID;
  name: string;
  nodes: NodeModel[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
};

export type HistoryEntry = {
  snapshot: Omit<WorkflowState, "history" | "redoStack">;
  description?: string;
};

export type WorkflowState = {
  workflow: Workflow;
  viewport: Viewport;
  selection: { nodes: Set<UUID>; edges: Set<UUID> };
  history: HistoryEntry[];
  redoStack: HistoryEntry[];
  connectionDraft?: ConnectionDraft;
};

export type ConnectionDraft = {
  from?: { nodeId: UUID; portId: UUID; kind: PortKind };
  to?: { nodeId: UUID; portId: UUID; kind: PortKind };
  cursor?: Point; // in canvas coordinates
};
