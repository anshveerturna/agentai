interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowConnectionProps {
  connection: Connection;
  sourcePosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  isDraft?: boolean;
}

export function WorkflowConnection({ 
  connection, 
  sourcePosition, 
  targetPosition, 
  isDraft = false 
}: WorkflowConnectionProps) {
  const { x: x1, y: y1 } = sourcePosition;
  const { x: x2, y: y2 } = targetPosition;

  // Calculate bezier curve control points
  const dx = x2 - x1;
  const controlOffset = Math.max(50, Math.abs(dx) * 0.5);
  
  const cx1 = x1 + controlOffset;
  const cy1 = y1;
  const cx2 = x2 - controlOffset;
  const cy2 = y2;

  const pathData = `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`;

  return (
    <g>
      {/* Connection Path */}
      <path
        d={pathData}
        fill="none"
        stroke={isDraft ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.8)"}
        strokeWidth="2"
        strokeDasharray={isDraft ? "5,5" : "none"}
        markerEnd={isDraft ? undefined : "url(#arrowhead)"}
        className="transition-all duration-200 hover:stroke-primary"
      />
      
      {/* Arrow Marker Definition */}
      {!isDraft && (
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="rgba(59, 130, 246, 0.8)"
            />
          </marker>
        </defs>
      )}

      {/* Connection Label (if any) */}
      {!isDraft && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 8}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
          fontSize="10"
        >
          {/* Add connection label here if needed */}
        </text>
      )}
    </g>
  );
}
