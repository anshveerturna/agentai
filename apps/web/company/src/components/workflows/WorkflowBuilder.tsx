"use client";

import React from "react";
import { WorkflowCanvas } from "./canvas/WorkflowCanvas";
import { CodeEditor } from "./editor/CodeEditor";
import { Toolbar } from "./toolbar/Toolbar";

export function WorkflowBuilder() {
  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <div className="flex-grow relative">
        <WorkflowCanvas />
        {/* <CodeEditor /> */}
      </div>
      <Toolbar />
    </div>
  );
}
