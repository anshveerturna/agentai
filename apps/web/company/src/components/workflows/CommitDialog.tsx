"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (name: string, description: string) => void | Promise<void>;
  isSaving?: boolean;
}

export function CommitDialog({ isOpen, onClose, onCommit, isSaving = false }: CommitDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleCommit = async () => {
    if (!name.trim()) {
      alert('Please enter a commit name');
      return;
    }
    await onCommit(name.trim(), description.trim());
    setName('');
    setDescription('');
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Create Commit</h2>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          <div>
            <label htmlFor="commit-name" className="block text-sm font-medium mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="commit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Add user authentication flow"
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div>
            <label htmlFor="commit-description" className="block text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="commit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of changes..."
              rows={4}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCommit}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? 'Committing...' : 'Commit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
