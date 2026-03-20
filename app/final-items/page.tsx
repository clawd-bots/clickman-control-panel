'use client';
import { useState } from 'react';
import { Check, AlertTriangle, User, Bot, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { finalItems as initialFinalItems, getAllDone, getPendingCount, type FinalItem } from '@/lib/final-items';

const categoryColor = {
  'data': 'bg-brand-blue/10 text-brand-blue-light',
  'integration': 'bg-warm-gold/10 text-warm-gold',
  'config': 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300',
};

const ownerConfig = {
  jordan: { label: 'Jordan', icon: User, color: 'text-warm-gold' },
  alfred: { label: 'Alfred', icon: Bot, color: 'text-brand-blue-light' },
  both: { label: 'Both', icon: User, color: 'text-text-tertiary' },
};

export default function FinalItemsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const allItems = initialFinalItems;
  const pendingItems = allItems.filter(item => item.status === 'pending' || item.status === 'in-progress');
  const doneItems = allItems.filter(item => item.status === 'done');
  const jordanItems = pendingItems.filter(item => item.owner === 'jordan' || item.owner === 'both');
  const alfredItems = pendingItems.filter(item => item.owner === 'alfred');
  const pendingCount = getPendingCount(allItems);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg sm:text-xl font-semibold">Final Items</h2>
      </div>

      {/* Intro */}
      <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 mx-1">
        <p className="text-sm text-text-primary">
          <strong className="text-danger">Everything below needs to happen before go-live.</strong>{' '}
          Click any item to see exactly what to do. Most items just need you to send Alfred an API key or share access. Once everything is done, this tab disappears.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mx-1">
        <div className="bg-bg-surface border border-danger/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-danger" />
            <span className="text-xs font-medium text-danger">Total Pending</span>
          </div>
          <span className="text-2xl font-bold text-danger">{pendingCount}</span>
          <p className="text-[10px] text-text-tertiary mt-1">items before go-live</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-warm-gold" />
            <span className="text-xs font-medium text-warm-gold">Waiting on Jordan</span>
          </div>
          <span className="text-2xl font-bold text-text-primary">{jordanItems.length}</span>
          <p className="text-[10px] text-text-tertiary mt-1">send access or info to Alfred</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={14} className="text-brand-blue-light" />
            <span className="text-xs font-medium text-brand-blue-light">On Alfred</span>
          </div>
          <span className="text-2xl font-bold text-text-primary">{alfredItems.length}</span>
          <p className="text-[10px] text-text-tertiary mt-1">Alfred handles once access is granted</p>
        </div>
      </div>

      {/* Expandable Items List */}
      <div className="bg-bg-surface border border-danger/20 rounded-lg p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
            <AlertTriangle size={14} />
            What&apos;s Needed
          </h3>
          <span className="text-[10px] text-text-tertiary hidden sm:block">Click an item for instructions</span>
        </div>

        <div className="space-y-2">
          {pendingItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const { label: ownerName, icon: OwnerIcon, color: ownerColor } = ownerConfig[item.owner];

            return (
              <div
                key={item.id}
                className={`bg-bg-elevated rounded-lg border transition-all ${
                  isExpanded ? 'border-danger/40' : 'border-border/50 hover:border-border'
                }`}
              >
                {/* Header row, always visible */}
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="shrink-0">
                    {isExpanded
                      ? <ChevronDown size={14} className="text-danger" />
                      : <ChevronRight size={14} className="text-text-tertiary" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{item.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColor[item.category]}`}>
                        {item.category}
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-text-tertiary mt-0.5 truncate">{item.why}</p>
                    )}
                  </div>

                  {/* Owner badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <OwnerIcon size={12} className={ownerColor} />
                    <span className={`text-[10px] font-medium ${ownerColor} hidden sm:inline`}>
                      {ownerName}
                    </span>
                  </div>

                  {/* Pages unlocked */}
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    {item.pages.slice(0, 2).map(page => (
                      <span key={page} className="text-[9px] bg-bg-surface px-1.5 py-0.5 rounded text-text-tertiary">
                        {page}
                      </span>
                    ))}
                    {item.pages.length > 2 && (
                      <span className="text-[9px] text-text-tertiary">+{item.pages.length - 2}</span>
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/30 mx-4 mb-0">
                    {/* Why this matters */}
                    <div className="mt-3 mb-4">
                      <p className="text-xs text-text-secondary">{item.why}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] text-text-tertiary">Unlocks:</span>
                        {item.pages.map(page => (
                          <span key={page} className="text-[10px] bg-brand-blue/10 text-brand-blue-light px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ExternalLink size={8} />
                            {page}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action options */}
                    <div className="space-y-3">
                      {item.actions.map((action, actionIdx) => (
                        <div key={actionIdx} className="bg-bg-surface rounded-lg p-3 border border-border/50">
                          <h4 className="text-xs font-semibold text-text-primary mb-2">{action.label}</h4>
                          <ol className="space-y-1.5">
                            {action.steps.map((step, stepIdx) => (
                              <li key={stepIdx} className="flex items-start gap-2 text-xs text-text-secondary">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-brand-blue/15 text-brand-blue-light text-[10px] font-bold flex items-center justify-center mt-0.5">
                                  {stepIdx + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Done items */}
        {doneItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <h4 className="text-xs text-success font-medium mb-2">✓ Completed</h4>
            {doneItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-1.5 opacity-50">
                <div className="w-3 h-3 rounded-full bg-success/30 border-2 border-success flex items-center justify-center">
                  <Check size={8} className="text-success" />
                </div>
                <span className="text-xs text-text-secondary line-through">{item.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}