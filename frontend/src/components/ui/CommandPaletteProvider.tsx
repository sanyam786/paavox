'use client';

import { useState, useEffect, useCallback } from 'react';
import CommandPalette from './CommandPalette';

export default function CommandPaletteProvider() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
  }, []);

  const handleOpenEvent = useCallback(() => setOpen(true), []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openCommandPalette', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openCommandPalette', handleOpenEvent);
    };
  }, [handleKeyDown, handleOpenEvent]);

  if (!open) return null;
  return <CommandPalette onClose={() => setOpen(false)} />;
}
