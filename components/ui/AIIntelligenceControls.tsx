'use client';
import { useState } from 'react';
import { History, RefreshCw, EyeOff, Eye } from 'lucide-react';

interface AIIntelligenceControlsProps {
  intelligenceId: string;
  title: string;
  onHistory?: () => void;
  onRefresh?: () => void;
  onToggleVisibility?: (visible: boolean) => void;
  className?: string;
}

export default function AIIntelligenceControls({
  intelligenceId,
  title,
  onHistory,
  onRefresh,
  onToggleVisibility,
  className = ''
}: AIIntelligenceControlsProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleToggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggleVisibility?.(newVisibility);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      
      <button
        onClick={onHistory}
        className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors"
        title="View analysis history"
      >
        <History className="w-3 h-3" />
        History
      </button>
      
      <button
        onClick={onRefresh}
        className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors"
        title="Refresh analysis"
      >
        <RefreshCw className="w-3 h-3" />
        Refresh
      </button>
      
      <button
        onClick={handleToggleVisibility}
        className="flex items-center gap-1 px-2 py-1 bg-bg-elevated text-text-secondary border border-border rounded-md text-xs font-medium hover:bg-bg-surface hover:text-text-primary transition-colors"
        title={isVisible ? 'Hide section' : 'Show section'}
      >
        {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {isVisible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}