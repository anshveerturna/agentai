"use client";

import { useMemo } from 'react';
import Editor from '@monaco-editor/react';

export default function MonacoEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = useMemo(() => ({
    minimap: { enabled: false },
    fontSize: 12,
    wordWrap: 'on' as const,
    scrollBeyondLastLine: false,
    theme: 'vs-dark'
  }), []);

  return (
    <Editor
      height="100%"
      defaultLanguage="json"
      value={value}
      onChange={(v) => onChange(v || '')}
      options={options}
    />
  );
}
