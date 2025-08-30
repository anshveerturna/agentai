"use client";

import React from 'react';

export function Toolbar() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg p-2 flex items-center space-x-2">
      {/* Toolbar icons will go here */}
      <button className="p-2 rounded-md hover:bg-muted">Cursor</button>
      <button className="p-2 rounded-md hover:bg-muted">Hand</button>
      <button className="p-2 rounded-md hover:bg-muted">Connector</button>
    </div>
  );
}
