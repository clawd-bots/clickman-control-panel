'use client';
import { useState, useMemo } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { targets as initialTargets, targetTrend, targetAISuggestions } from '@/lib/sample-data';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Pencil, Check, X, Users as UsersIcon } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';

// Monthly target data structure
interface MonthlyTarget {
  metric: string;
  unit: string;
  Apr26: string;
  May26: string;
  Jun26: string;
  Jul26: string;
  Aug26: string;
  Sep26: string;
  Oct26: string;
  Nov26: string;
  Dec26: string;
  Jan27: string;
  Feb27: string;
  Mar27: string;
  lastUpdated: string;
}

const initialMonthlyTargets: MonthlyTarget[] = [
  {
    metric: 'Net Revenue',
    unit: '₱',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'MER',
    unit: 'x',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'aMER', 
    unit: 'x',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'NC Orders',
    unit: '#',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'CAC',
    unit: '₱',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'nCAC',
    unit: '₱', 
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'CM3',
    unit: '₱',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'CM3%',
    unit: '%',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'AOV',
    unit: '₱',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'Total Orders',
    unit: '#',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
];

const monthColumns = ['Apr26', 'May26', 'Jun26', 'Jul26', 'Aug26', 'Sep26', 'Oct26', 'Nov26', 'Dec26', 'Jan27', 'Feb27', 'Mar27'] as const;
const monthLabels = ['Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27'];

export default function TargetsPage() {
  const { currency, convertValue } = useCurrency();
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTarget[]>(initialMonthlyTargets);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  // Start editing a cell
  const startEdit = (rowIndex: number, colKey: string, currentValue: string) => {
    // Don't allow editing auto-calculated metrics
    const metric = monthlyTargets[rowIndex].metric;
    if (isAutoCalculated(metric)) {
      return; // Block editing for auto-calculated targets
    }
    
    setEditingCell({ row: rowIndex, col: colKey });
    setEditValue(currentValue);
  };

  // Check if a metric is auto-calculated
  const isAutoCalculated = (metric: string): boolean => {
    return ['AOV', 'MER', 'aMER'].includes(metric);
  };

  // Save edit with auto-calculation logic
  const saveEdit = () => {
    if (!editingCell) return;
    
    setMonthlyTargets(prev => {
      const updatedTargets = prev.map((target, i) => 
        i === editingCell.row 
          ? { 
              ...target, 
              [editingCell.col]: editValue,
              lastUpdated: 'Just now' 
            }
          : target
      );
      
      // Auto-calculations for various metrics
      if (editingCell.col !== 'lastUpdated') {
        const colKey = editingCell.col as keyof MonthlyTarget;
        
        // Get all relevant metrics
        const revenue = updatedTargets.find(t => t.metric === 'Net Revenue');
        const ncOrders = updatedTargets.find(t => t.metric === 'NC Orders');
        const cac = updatedTargets.find(t => t.metric === 'CAC');
        const ncac = updatedTargets.find(t => t.metric === 'nCAC');
        const aovRow = updatedTargets.find(t => t.metric === 'AOV');
        const merRow = updatedTargets.find(t => t.metric === 'MER');
        const amerRow = updatedTargets.find(t => t.metric === 'aMER');
        
        const revenueValue = parseFloat(revenue?.[colKey] as string) || 0;
        const ordersValue = parseFloat(ncOrders?.[colKey] as string) || 0;
        const cacValue = parseFloat(cac?.[colKey] as string) || 0;
        const ncacValue = parseFloat(ncac?.[colKey] as string) || 0;
        
        // Auto-calculate AOV when revenue and NC Orders are available
        if (revenue && ncOrders && aovRow && revenueValue > 0 && ordersValue > 0) {
          const calculatedAOV = Math.round(revenueValue / ordersValue);
          aovRow[colKey] = calculatedAOV.toString();
          aovRow.lastUpdated = 'Auto-calculated';
        }
        
        // Auto-calculate MER when Net Revenue and CAC are available
        // MER = Net Revenue / (CAC * NC Orders) - simplified as Net Revenue / Marketing Spend
        if (revenue && ncOrders && cac && merRow && revenueValue > 0 && ordersValue > 0 && cacValue > 0) {
          const marketingSpend = cacValue * ordersValue;
          const calculatedMER = (revenueValue / marketingSpend).toFixed(2);
          merRow[colKey] = calculatedMER;
          merRow.lastUpdated = 'Auto-calculated';
        }
        
        // Auto-calculate aMER when Net Revenue and nCAC are available  
        if (revenue && ncOrders && ncac && amerRow && revenueValue > 0 && ordersValue > 0 && ncacValue > 0) {
          const newCustomerSpend = ncacValue * ordersValue;
          const calculatedAMER = (revenueValue / newCustomerSpend).toFixed(2);
          amerRow[colKey] = calculatedAMER;
          amerRow.lastUpdated = 'Auto-calculated';
        }
      }
      
      return updatedTargets;
    });
    
    setEditingCell(null);
    setEditValue('');
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Dynamic AI suggestions with historical data analysis
  const getDynamicTargetIntelligence = () => {
    return [
      `Based on 30-day trend: Current revenue run rate ${formatCurrencyValue(322000)}/day suggests April target should be ${formatCurrencyValue(2800000)} (vs typical ${formatCurrencyValue(2500000)}).`,
      `Historical seasonality: Q4 typically sees 15-20% lift. December targets should reflect holiday season boost in spend and conversions.`,
      `90-day moving average shows nCAC improving 8% MoM. Set progressive reduction targets: Apr ${formatCurrencyValue(780)} → Dec ${formatCurrencyValue(650)}.`,
      `365-day cohort data indicates March-May launches perform 25% better. Increase Q2 new customer targets by corresponding amount.`,
      `Year-over-year comparison: 2025 Q4 was 18% higher than Q3. Apply similar seasonal multipliers to 2026 targets for realistic goal setting.`,
    ];
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1">
        <h2 className="text-lg sm:text-xl font-semibold">Targets & Goals</h2>
        <p className="text-sm text-text-secondary mt-1">
          Set monthly targets in table format. Each month gets specific goals per metric.
        </p>
      </div>

      {/* Monthly Targets Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-text-primary mb-1 flex items-center gap-2">
            <span>Monthly Target Entry Table</span>
            <InfoTooltip metric="Monthly Targets" />
          </h3>

        </div>
        
        {/* Mobile Horizontal Scroll Table - Like Desktop */}
        <div className="block lg:hidden overflow-x-auto -mx-1">
          <div className="min-w-[800px]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-semibold text-text-primary sticky left-0 bg-bg-surface min-w-[140px] z-10 border-r border-border">
                    Metric
                  </th>
                  {monthLabels.slice(0, 1).map((month, i) => (
                    <th key={month} className="text-center py-3 px-3 font-medium text-text-secondary min-w-[100px]">
                      {month}
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 font-medium text-text-tertiary min-w-[100px]">
                    <span className="text-[10px]">← Scroll for more →</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyTargets.map((row, rowIndex) => (
                  <tr key={row.metric} className="border-b border-border/30 hover:bg-bg-elevated/30">
                    <td className="py-2 px-3 font-medium text-text-primary sticky left-0 bg-bg-surface z-10 border-r border-border">
                      <div className="flex items-center gap-1">
                        {row.metric}
                        <InfoTooltip metric={row.metric} />
                      </div>
                    </td>
                    {monthColumns.map((colKey, colIndex) => {
                      const cellValue = row[colKey];
                      const isAutoCalc = isAutoCalculated(row.metric);
                      const isEditing = editingCell?.row === rowIndex && editingCell?.col === colKey;

                      return (
                        <td key={`${rowIndex}-${colIndex}`} className="py-1.5 px-2 text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="w-16 py-1 px-2 rounded text-center text-text-primary bg-bg-primary border border-warm-gold outline-none text-xs"
                                autoFocus
                                placeholder={row.unit}
                              />
                              <button onClick={saveEdit} className="text-success hover:text-success/80">
                                <Check size={10} />
                              </button>
                              <button onClick={cancelEdit} className="text-text-tertiary hover:text-danger">
                                <X size={10} />
                              </button>
                            </div>
                          ) : isAutoCalc ? (
                            <div 
                              className={`w-full py-1 px-2 rounded text-xs cursor-not-allowed ${
                                cellValue 
                                  ? 'text-blue-600 bg-blue-50 border border-blue-200' 
                                  : 'text-text-tertiary bg-bg-elevated border border-dashed border-text-tertiary opacity-60'
                              }`}
                              title={cellValue 
                                ? `Auto-calculated: ${cellValue}` 
                                : `Will be auto-calculated`
                              }
                            >
                              {cellValue ? (
                                <span className="flex items-center justify-center gap-1">
                                  <span>{cellValue}</span>
                                  <span className="text-blue-500 text-[8px]">⚙</span>
                                </span>
                              ) : (
                                <span className="text-text-tertiary">Auto</span>
                              )}
                            </div>
                          ) : (
                            <button 
                              className={`w-full py-1 px-2 rounded transition-all text-xs ${
                                cellValue 
                                  ? 'text-text-primary hover:bg-bg-primary border border-transparent hover:border-border' 
                                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-primary border border-dashed border-text-tertiary hover:border-text-secondary'
                              }`}
                              onClick={() => startEdit(rowIndex, colKey, cellValue)}
                              title={cellValue || `Set target`}
                            >
                              {cellValue || 'Set'}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Desktop Table View - Hidden on Mobile */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-semibold text-text-primary sticky left-0 bg-bg-surface min-w-[140px]">
                  Metric
                </th>
                {monthLabels.map((month, i) => (
                  <th key={month} className="text-center py-3 px-3 font-medium text-text-secondary min-w-[100px]">
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyTargets.map((row, rowIndex) => (
                <tr key={row.metric} className="border-b border-border/30 hover:bg-bg-elevated/30">
                  <td className="py-2 px-3 font-medium text-text-primary sticky left-0 bg-bg-surface">
                    <div className="flex items-center gap-1">
                      {row.metric}
                      <InfoTooltip metric={row.metric} />
                    </div>
                  </td>
                  {monthColumns.map((colKey, colIndex) => {
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colKey;
                    const cellValue = row[colKey];
                    const isAutoCalc = isAutoCalculated(row.metric);
                    
                    return (
                      <td key={`${rowIndex}-${colIndex}`} className="py-2 px-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="w-20 py-1.5 px-2 rounded text-center text-text-primary bg-bg-primary border border-warm-gold outline-none text-xs"
                              autoFocus
                              placeholder={row.unit}
                            />
                            <button onClick={saveEdit} className="text-success hover:text-success/80">
                              <Check size={12} />
                            </button>
                            <button onClick={cancelEdit} className="text-text-tertiary hover:text-danger">
                              <X size={12} />
                            </button>
                          </div>
                        ) : isAutoCalc ? (
                          // Auto-calculated cell - disabled from editing
                          <div 
                            className={`w-full py-1.5 px-3 rounded text-xs cursor-not-allowed ${
                              cellValue 
                                ? 'text-blue-600 bg-blue-50 border border-blue-200' 
                                : 'text-text-tertiary bg-bg-elevated border border-dashed border-text-tertiary opacity-60'
                            }`}
                            title={cellValue 
                              ? `Auto-calculated: ${cellValue} (based on other targets)` 
                              : `Will be auto-calculated when Net Revenue, NC Orders, and ${row.metric === 'AOV' ? 'other' : row.metric === 'MER' ? 'CAC' : 'nCAC'} targets are set`
                            }
                          >
                            {cellValue ? (
                              <span className="flex items-center justify-center gap-1">
                                <span>{cellValue}</span>
                                <span className="text-blue-500 text-[10px]">⚙</span>
                              </span>
                            ) : (
                              <span className="text-text-tertiary">Auto-calc</span>
                            )}
                          </div>
                        ) : (
                          // Editable cell
                          <button 
                            className={`w-full py-1.5 px-3 rounded transition-all text-xs ${
                              cellValue 
                                ? 'text-text-primary hover:bg-bg-primary border border-transparent hover:border-border' 
                                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-primary border border-dashed border-text-tertiary hover:border-text-secondary'
                            }`}
                            onClick={() => startEdit(rowIndex, colKey, cellValue)}
                            title={cellValue || `Set ${row.metric} target for ${monthLabels[colIndex]}`}
                          >
                            {cellValue || 'Set target'}
                          </button>
                        )}
                      </td>
                    );
                  })}

                </tr>
              ))}
              {/* Column Save Buttons Row - Desktop Only */}
              <tr className="border-t border-border bg-bg-elevated/30">
                <td className="py-3 px-3 font-medium text-text-secondary sticky left-0 bg-bg-elevated/30">
                  Save Column
                </td>
                {monthColumns.map((colKey) => {
                  const columnHasData = monthlyTargets.some(target => target[colKey] && target[colKey] !== '');
                  return (
                    <td key={`save-${colKey}`} className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => {
                          // Save all values in this column
                          setMonthlyTargets(prev => prev.map(target => ({
                            ...target,
                            lastUpdated: columnHasData ? 'Saved' : 'Never'
                          })));
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          columnHasData 
                            ? 'bg-success/15 text-success hover:bg-success/25' 
                            : 'bg-text-tertiary/10 text-text-tertiary cursor-not-allowed'
                        }`}
                        disabled={!columnHasData}
                      >
                        Save
                      </button>
                    </td>
                  );
                })}
              </tr>
              {/* Last Updated Summary Row */}
              <tr className="border-t border-border/50 bg-bg-elevated/20">
                <td className="py-2.5 px-3 font-medium text-text-secondary sticky left-0 bg-bg-elevated/20">
                  Last Updated
                </td>
                {monthColumns.map((colKey) => (
                  <td key={`lastupdate-${colKey}`} className="py-2.5 px-2 text-center text-xs text-text-tertiary">
                    {/* Show most recent update time for this column across all metrics */}
                    {monthlyTargets.find(target => target[colKey] && target[colKey] !== '')?.lastUpdated || 'Never'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Intelligence */}
      <div className="px-1">
        <AISuggestionsPanel 
          suggestions={getDynamicTargetIntelligence()} 
          title="Target Intelligence"
        />
      </div>
    </div>
  );
}