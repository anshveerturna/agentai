"use client";
import React from 'react';
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath,
  Position,
} from '@xyflow/react';

// A smooth edge that leaves a small gap between the node body and the path/arrow
export default function MinimalSmoothEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
  } = props;

  const gap = 6; // px gap from node edges (increased for clearer separation)

  let sx = sourceX;
  let sy = sourceY;
  let tx = targetX;
  let ty = targetY;

  switch (sourcePosition) {
    case Position.Left:
      sx -= gap;
      break;
    case Position.Right:
      sx += gap;
      break;
    case Position.Top:
      sy -= gap;
      break;
    case Position.Bottom:
      sy += gap;
      break;
  }

  switch (targetPosition) {
    case Position.Left:
      tx -= gap;
      break;
    case Position.Right:
      tx += gap;
      break;
    case Position.Top:
      ty -= gap;
      break;
    case Position.Bottom:
      ty += gap;
      break;
  }

  const [path] = getSmoothStepPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return <BaseEdge path={path} markerEnd={markerEnd} style={style} />;
}
