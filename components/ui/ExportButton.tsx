'use client';
import { Download } from 'lucide-react';

export default function ExportButton() {
  return (
    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs text-text-secondary hover:text-text-primary hover:border-text-tertiary transition-colors">
      <Download size={12} />
      Export XLSX
    </button>
  );
}
