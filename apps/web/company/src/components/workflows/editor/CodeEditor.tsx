"use client";

import React from 'react';
import Editor from '@monaco-editor/react';

export function CodeEditor() {
  return (
    <div className="absolute top-0 right-0 h-full w-1/3 bg-card border-l border-border">
      <Editor
        height="100%"
        defaultLanguage="yaml"
        defaultValue="# Your workflow code will appear here"
        theme="vs-dark"
      />
    </div>
  );
}
