import React, { memo } from "react";
import type { Point } from "@/types/flow";

interface SelectionBoxProps {
  startPoint: Point;
  currentPoint: Point;
  isVisible: boolean;
}

export const SelectionBox = memo(({ startPoint, currentPoint, isVisible }: SelectionBoxProps) => {
  if (!isVisible) return null;
  
  const left = Math.min(startPoint.x, currentPoint.x);
  const top = Math.min(startPoint.y, currentPoint.y);
  const width = Math.abs(currentPoint.x - startPoint.x);
  const height = Math.abs(currentPoint.y - startPoint.y);
  
  return (
    <div
      className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
      style={{
        left,
        top,
        width,
        height
      }}
    />
  );
});

SelectionBox.displayName = "SelectionBox";
