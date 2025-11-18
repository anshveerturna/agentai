"use client";
import React, { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

type TextNodeProps = {
  id: string;
  data: { label?: string; config?: Record<string, unknown> };
  selected?: boolean;
  width?: number;
  height?: number;
};

export default function TextNode(props: TextNodeProps) {
  const { id, data = {}, selected = false, width, height } = props as TextNodeProps;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const [text, setText] = useState<string>((data?.label as string) || "Text");
  const boxRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof data?.label === "string" && data.label !== text && editRef.current) {
      setText(data.label);
      editRef.current.textContent = data.label;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.label]);

  const w = width ?? 220;
  const h = height ?? 80;

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = (e.currentTarget.textContent ?? "").replace(/\s+$/g, "");
    setText(content);
  };

  const commit = () => {
    updateNode(id as any, { label: text } as any);
  };

  // Resize handle (bottom-right)
  useEffect(() => {
    const el = handleRef.current;
    const box = boxRef.current;
    if (!el || !box) return;
    let startX = 0, startY = 0, startW = w, startH = h;
    let dragging = false;

    const onDown = (e: MouseEvent) => {
      e.stopPropagation(); e.preventDefault();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startW = box.offsetWidth; startH = box.offsetHeight;
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dw = e.clientX - startX;
      const dh = e.clientY - startY;
      const nextW = Math.round(startW + dw);
      const nextH = Math.round(startH + dh);
      updateNode(id as any, { size: { width: nextW, height: nextH } } as any);
    };

    const onUp = () => {
      dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    el.addEventListener("mousedown", onDown);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, updateNode, w, h]);

  return (
    <div
      ref={boxRef}
      className={
        "relative bg-white dark:bg-neutral-900 border " +
        (selected ? "border-blue-500 shadow-[inset_0_0_0_1px_rgba(31,111,235,0.9)]" : "border-gray-300 dark:border-neutral-700") +
        " rounded-md"
      }
      style={{ width: w, height: h, padding: 8 }}
      onMouseDown={(e) => {
        // allow dragging the node normally; don't stop propagation here
      }}
    >
      <div
        ref={editRef}
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        className="w-full h-full outline-none text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words overflow-auto"
        onInput={onInput}
        onBlur={commit}
        onKeyDown={(e) => {
          // Only stop propagation for specific shortcuts, allow typing
          if (e.key === 'Delete' || e.key === 'Backspace') {
            // Allow these keys for editing text, but stop propagation so node isn't deleted
            e.stopPropagation();
            return;
          }
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.stopPropagation();
            (e.target as HTMLElement).blur();
            return;
          }
          // Stop propagation for all other keys to prevent canvas shortcuts while typing
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          // keep focus for selection/edit
          e.stopPropagation();
        }}
      >
        {text}
      </div>

      {/* Resize handle */}
      <div
        ref={handleRef}
        className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-3 h-3 bg-blue-500 rounded-sm shadow cursor-se-resize"
        onMouseDown={(e) => { e.stopPropagation(); }}
        title="Drag to resize"
      />
    </div>
  );
}
