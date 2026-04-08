'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { targets as initialTargets, targetTrend, targetAISuggestions } from '@/lib/sample-data';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { filterByDateRange, formatDateLabel } from '@/lib/dateUtils';
import { Pencil, Check, X, Users as UsersIcon } from 'lucide-react';
import { useCurrency } from '@/components/CurrencyProvider';
import { useDateRange } from '@/components/DateProvider';
import { getPromptById, syncPromptChanges } from '@/lib/prompt-registry';
import { MonthlyTargetData, loadTargets, loadTargetsFromServer, saveTargets } from '@/lib/targets';

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

// Unit types: 'currency' will be dynamically resolved to the active currency symbol
type UnitType = 'currency' | 'x' | '#' | '%';

const initialMonthlyTargets: MonthlyTarget[] = [
  {
    metric: 'Net Revenue',
    unit: 'currency',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'Marketing Costs',
    unit: 'currency',
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
    unit: 'currency',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'CPA',
    unit: 'currency',
    Apr26: '', May26: '', Jun26: '', Jul26: '', Aug26: '', Sep26: '',
    Oct26: '', Nov26: '', Dec26: '', Jan27: '', Feb27: '', Mar27: '',
    lastUpdated: 'Never',
  },
  {
    metric: 'nCAC',
    unit: 'currency', 
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
    unit: 'currency',
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

let initialMonthColumns = ['Apr26', 'May26', 'Jun26', 'Jul26', 'Aug26', 'Sep26', 'Oct26', 'Nov26', 'Dec26', 'Jan27', 'Feb27', 'Mar27'] as const;
let initialMonthLabels = ['Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27'];

const monthColumns = ['Apr26', 'May26', 'Jun26', 'Jul26', 'Aug26', 'Sep26', 'Oct26', 'Nov26', 'Dec26', 'Jan27', 'Feb27', 'Mar27'] as const;
const monthLabels = ['Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27'];

export default function TargetsPage() {
  const { currency, convertValue, exchangeRate } = useCurrency();
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTarget[]>(initialMonthlyTargets);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentMonthColumns, setCurrentMonthColumns] = useState<string[]>([...monthColumns]);
  const [currentMonthLabels, setCurrentMonthLabels] = useState<string[]>([...monthLabels]);
  const [showAddMonthDialog, setShowAddMonthDialog] = useState(false);

  // Helper to apply saved data to the target rows
  const applyTargetData = useCallback((saved: MonthlyTargetData) => {
    if (Object.keys(saved).length > 0) {
      setMonthlyTargets(prev => prev.map(row => {
        const metricData = saved[row.metric];
        if (!metricData) return row;
        const updated = { ...row };
        for (const [monthKey, value] of Object.entries(metricData)) {
          if (monthKey in updated && value > 0) {
            (updated as any)[monthKey] = value.toString();
          }
        }
        if (Object.keys(metricData).length > 0) {
          updated.lastUpdated = 'Saved';
        }
        return updated;
      }));
    }
  }, []);

  // Load saved targets from server on mount (falls back to localStorage)
  useEffect(() => {
    // Show localStorage cache immediately
    const localData = loadTargets();
    applyTargetData(localData);
    
    // Then hydrate from server (source of truth)
    loadTargetsFromServer().then((serverData) => {
      if (Object.keys(serverData).length > 0) {
        applyTargetData(serverData);
      }
    });
  }, [applyTargetData]);

  // Persist targets to localStorage and dispatch event whenever they change
  const persistTargets = useCallback((targets: MonthlyTarget[]) => {
    const data: MonthlyTargetData = {};
    for (const row of targets) {
      const metricData: Record<string, number> = {};
      for (const col of currentMonthColumns) {
        const val = parseFloat((row as any)[col] as string);
        if (!isNaN(val) && val > 0) {
          metricData[col] = val;
        }
      }
      if (Object.keys(metricData).length > 0) {
        data[row.metric] = metricData;
      }
    }
    saveTargets(data);
    // Notify other components (e.g., Dashboard) that targets changed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('targetsUpdated'));
    }
  }, [currentMonthColumns]);

  // Auto-persist whenever targets change (skip initial empty state)
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!hasLoaded) {
      setHasLoaded(true);
      return;
    }
    persistTargets(monthlyTargets);
  }, [monthlyTargets, hasLoaded, persistTargets]);

  // Helper function to format currency with current context
  const formatCurrencyValue = (value: number) => {
    return formatCurrency(convertValue(value), currency);
  };

  /** Stored target numbers for money rows are always PHP (shop currency), same as TW/API. */
  const formatStoredCurrencyCell = (phpString: string) => {
    const n = parseFloat(phpString);
    if (!Number.isFinite(n)) return phpString;
    return formatCurrencyValue(n);
  };

  const displayInputFromStoredPhp = (phpString: string) => {
    if (!phpString?.trim()) return '';
    const n = parseFloat(phpString);
    if (!Number.isFinite(n)) return '';
    const d = convertValue(n);
    const rounded = Math.round(d * 1e6) / 1e6;
    return String(rounded);
  };

  const storedPhpFromDisplayInput = (raw: string): string => {
    const t = raw.trim();
    if (!t) return '';
    const n = parseFloat(t);
    if (!Number.isFinite(n)) return '';
    const php = currency === '$' ? n * exchangeRate : n;
    return String(Math.round(php * 100) / 100);
  };

  // Resolve unit display: 'currency' becomes the active currency symbol
  const getUnitDisplay = (unit: string): string => {
    if (unit === 'currency') return currency;
    return unit;
  };

  // Start editing a cell
  const startEdit = (rowIndex: number, colKey: string, currentValue: string) => {
    // Don't allow editing auto-calculated metrics
    const row = monthlyTargets[rowIndex];
    if (isAutoCalculated(row.metric)) {
      return; // Block editing for auto-calculated targets
    }
    
    setEditingCell({ row: rowIndex, col: colKey });
    const initial =
      row.unit === 'currency' ? displayInputFromStoredPhp(currentValue) : currentValue;
    setEditValue(initial);
  };

  // Check if a metric is auto-calculated
  const isAutoCalculated = (metric: string): boolean => {
    return ['AOV', 'MER', 'aMER'].includes(metric);
  };

  // Save edit with auto-calculation logic
  const saveEdit = () => {
    if (!editingCell) return;
    const editingRow = monthlyTargets[editingCell.row];
    const cellStored =
      editingRow.unit === 'currency' && editingCell.col !== 'lastUpdated'
        ? storedPhpFromDisplayInput(editValue)
        : editValue.trim();
    
    setMonthlyTargets(prev => {
      const updatedTargets = prev.map((target, i) => 
        i === editingCell.row 
          ? { 
              ...target, 
              [editingCell.col]: cellStored,
              lastUpdated: 'Just now' 
            }
          : target
      );
      
      // Auto-calculations for various metrics
      if (editingCell.col !== 'lastUpdated') {
        const colKey = editingCell.col;
        
        // Get all relevant metrics
        const revenue = updatedTargets.find(t => t.metric === 'Net Revenue');
        const marketingCosts = updatedTargets.find(t => t.metric === 'Marketing Costs');
        const ncOrders = updatedTargets.find(t => t.metric === 'NC Orders');
        const ncac = updatedTargets.find(t => t.metric === 'nCAC');
        const totalOrders = updatedTargets.find(t => t.metric === 'Total Orders');
        const aovRow = updatedTargets.find(t => t.metric === 'AOV');
        const merRow = updatedTargets.find(t => t.metric === 'MER');
        const amerRow = updatedTargets.find(t => t.metric === 'aMER');
        
        const revenueValue = parseFloat((revenue as any)?.[colKey] as string) || 0;
        const marketingCostsValue = parseFloat((marketingCosts as any)?.[colKey] as string) || 0;
        const ordersValue = parseFloat((ncOrders as any)?.[colKey] as string) || 0;
        const totalOrdersValue = parseFloat((totalOrders as any)?.[colKey] as string) || 0;
        const ncacValue = parseFloat((ncac as any)?.[colKey] as string) || 0;
        
        // Auto-calculate AOV when revenue and Total Orders are available
        if (revenue && totalOrders && aovRow && revenueValue > 0 && totalOrdersValue > 0) {
          const calculatedAOV = Math.round(revenueValue / totalOrdersValue);
          (aovRow as any)[colKey] = calculatedAOV.toString();
          aovRow.lastUpdated = 'Auto-calculated';
        }
        
        // Auto-calculate MER: Net Revenue / Marketing Costs
        if (revenue && marketingCosts && merRow && revenueValue > 0 && marketingCostsValue > 0) {
          const calculatedMER = (revenueValue / marketingCostsValue).toFixed(2);
          (merRow as any)[colKey] = calculatedMER;
          merRow.lastUpdated = 'Auto-calculated';
        }
        
        // Auto-calculate aMER when Net Revenue, nCAC, and NC Orders are available  
        if (revenue && ncOrders && ncac && amerRow && revenueValue > 0 && ordersValue > 0 && ncacValue > 0) {
          const newCustomerSpend = ncacValue * ordersValue;
          const calculatedAMER = (revenueValue / newCustomerSpend).toFixed(2);
          (amerRow as any)[colKey] = calculatedAMER;
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

  // Add new month column  
  const addNewMonth = () => {
    const lastMonth = currentMonthLabels[currentMonthLabels.length - 1];
    const lastMonthDate = new Date(lastMonth.replace(' ', ' 1, 20'));
    const nextMonth = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 1);
    
    const nextMonthKey = nextMonth.toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    }).replace(' ', '').replace("'", "");
    
    const nextMonthLabel = nextMonth.toLocaleDateString('en-US', { 
      month: 'short',
      year: '2-digit' 
    }).replace("'", "");

    // Add to column arrays
    setCurrentMonthColumns(prev => [...prev, nextMonthKey]);
    setCurrentMonthLabels(prev => [...prev, nextMonthLabel]);

    // Add empty column to all target rows
    setMonthlyTargets(prev => prev.map(target => ({
      ...target,
      [nextMonthKey]: ''
    })));

    setShowAddMonthDialog(false);
  };

  // Dynamic AI suggestions with historical data analysis linked to prompt templates
  const getDynamicTargetIntelligence = () => {
    const targetPrompt = getPromptById('target-intelligence');
    const basePrompt = targetPrompt?.prompt || '';
    
    // Generate specific suggestions based on current data and linked prompt
    return [
      `${basePrompt.split('.')[0]}: Current revenue run rate ${formatCurrencyValue(322000)}/day suggests April target should be ${formatCurrencyValue(2800000)} (vs typical ${formatCurrencyValue(2500000)}).`,
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
          Money rows are stored in PHP (shop currency); switching $ / ₱ in the top bar converts display and what you type when editing.
        </p>
      </div>

      {/* Monthly Targets Table */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <span>Monthly Target Entry Table</span>
              <InfoTooltip metric="Monthly Targets" />
            </h3>
            <span className="text-xs text-text-tertiary">• Changes are saved automatically</span>
          </div>
        </div>
        
        {/* Mobile Horizontal Scroll Table - Like Desktop */}
        <div className="block lg:hidden overflow-x-auto -mx-1">
          <div className="min-w-[800px]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-semibold text-text-primary sticky left-0 z-10 bg-bg-surface min-w-[140px] border-r border-border">
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
                    <td className="py-2 px-3 font-medium text-text-primary sticky left-0 z-10 bg-bg-surface border-r border-border">
                      <div className="flex items-center gap-1">
                        {row.metric}
                        <InfoTooltip metric={row.metric} />
                      </div>
                    </td>
                    {currentMonthColumns.map((colKey, colIndex) => {
                      const cellValue = (row as any)[colKey];
                      const isAutoCalc = isAutoCalculated(row.metric);
                      const isEditing = editingCell?.row === rowIndex && editingCell?.col === colKey;

                      return (
                        <td key={`${rowIndex}-${colIndex}`} className="py-1.5 px-2 text-center">
                          {(() => {
                            const unitDisplay = getUnitDisplay(row.unit);
                            const prefix = row.unit === 'currency' ? unitDisplay : '';
                            const suffix = row.unit === 'x' ? 'x' : row.unit === '%' ? '%' : '';
                            const amountLabel =
                              cellValue && row.unit === 'currency'
                                ? formatStoredCurrencyCell(cellValue)
                                : cellValue
                                  ? `${prefix}${cellValue}${suffix}`
                                  : '';
                            
                            if (isEditing) return (
                              <div className="flex items-center gap-1">
                                {prefix && <span className="text-text-tertiary text-xs">{prefix}</span>}
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
                                  placeholder="0"
                                />
                                {suffix && <span className="text-text-tertiary text-xs">{suffix}</span>}
                                <button onClick={saveEdit} className="text-success hover:text-success/80">
                                  <Check size={10} />
                                </button>
                                <button onClick={cancelEdit} className="text-text-tertiary hover:text-danger">
                                  <X size={10} />
                                </button>
                              </div>
                            );
                            
                            if (isAutoCalc) return (
                              <div 
                                className={`w-full py-1 px-2 rounded text-xs cursor-not-allowed ${
                                  cellValue 
                                    ? 'text-brand-blue-light bg-brand-blue/10 border border-brand-blue/25' 
                                    : 'text-text-tertiary bg-bg-elevated border border-dashed border-text-tertiary opacity-60'
                                }`}
                                title={cellValue ? `Auto-calculated: ${amountLabel}` : `Will be auto-calculated`}
                              >
                                {cellValue ? (
                                  <span className="flex items-center justify-center gap-1">
                                    <span>{amountLabel}</span>
                                    <span className="text-brand-blue-light text-[8px]">⚙</span>
                                  </span>
                                ) : (
                                  <span className="text-text-tertiary">Auto</span>
                                )}
                              </div>
                            );
                            
                            return (
                              <button 
                                className={`w-full py-1 px-2 rounded transition-all text-xs ${
                                  cellValue 
                                    ? 'text-text-primary hover:bg-bg-primary border border-transparent hover:border-border' 
                                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-primary border border-dashed border-text-tertiary hover:border-text-secondary'
                                }`}
                                onClick={() => startEdit(rowIndex, colKey, cellValue)}
                                title={amountLabel || `Set target`}
                              >
                                {cellValue ? amountLabel : 'Set'}
                              </button>
                            );
                          })()}
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
                <th className="text-left py-3 px-3 font-semibold text-text-primary sticky left-0 z-10 bg-bg-surface min-w-[140px]">
                  Metric
                </th>
                {currentMonthLabels.map((month, i) => (
                  <th key={month} className="text-center py-3 px-3 font-medium text-text-secondary min-w-[100px]">
                    {month}
                  </th>
                ))}
                <th className="text-center py-3 px-3 font-medium text-text-secondary min-w-[100px]">
                  <button
                    onClick={() => setShowAddMonthDialog(true)}
                    className="w-8 h-8 rounded-full bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue-light flex items-center justify-center transition-colors"
                    title="Add new month column"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyTargets.map((row, rowIndex) => (
                <tr key={row.metric} className="border-b border-border/30 hover:bg-bg-elevated/30">
                  <td className="py-2 px-3 font-medium text-text-primary sticky left-0 z-10 bg-bg-surface">
                    <div className="flex items-center gap-1">
                      {row.metric}
                      <InfoTooltip metric={row.metric} />
                    </div>
                  </td>
                  {currentMonthColumns.map((colKey, colIndex) => {
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colKey;
                    const cellValue = (row as any)[colKey];
                    const isAutoCalc = isAutoCalculated(row.metric);
                    
                    return (
                      <td key={`${rowIndex}-${colIndex}`} className="py-2 px-3 text-center">
                        {(() => {
                          const unitDisplay = getUnitDisplay(row.unit);
                          const prefix = row.unit === 'currency' ? unitDisplay : '';
                          const suffix = row.unit === 'x' ? 'x' : row.unit === '%' ? '%' : '';
                          const amountLabel =
                            cellValue && row.unit === 'currency'
                              ? formatStoredCurrencyCell(cellValue)
                              : cellValue
                                ? `${prefix}${cellValue}${suffix}`
                                : '';
                          
                          if (isEditing) return (
                            <div className="flex items-center justify-center gap-1">
                              {prefix && <span className="text-text-tertiary text-xs">{prefix}</span>}
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
                                placeholder="0"
                              />
                              {suffix && <span className="text-text-tertiary text-xs">{suffix}</span>}
                              <button onClick={saveEdit} className="text-success hover:text-success/80">
                                <Check size={12} />
                              </button>
                              <button onClick={cancelEdit} className="text-text-tertiary hover:text-danger">
                                <X size={12} />
                              </button>
                            </div>
                          );
                          
                          if (isAutoCalc) return (
                            <div 
                              className={`w-full py-1.5 px-3 rounded text-xs cursor-not-allowed ${
                                cellValue 
                                  ? 'text-brand-blue-light bg-brand-blue/10 border border-brand-blue/25' 
                                  : 'text-text-tertiary bg-bg-elevated border border-dashed border-text-tertiary opacity-60'
                              }`}
                              title={cellValue 
                                ? `Auto-calculated: ${amountLabel}` 
                                : `Will be auto-calculated from other targets`
                              }
                            >
                              {cellValue ? (
                                <span className="flex items-center justify-center gap-1">
                                  <span>{amountLabel}</span>
                                  <span className="text-brand-blue-light text-[10px]">⚙</span>
                                </span>
                              ) : (
                                <span className="text-text-tertiary">Auto-calc</span>
                              )}
                            </div>
                          );
                          
                          return (
                            <button 
                              className={`w-full py-1.5 px-3 rounded transition-all text-xs ${
                                cellValue 
                                  ? 'text-text-primary hover:bg-bg-primary border border-transparent hover:border-border' 
                                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-primary border border-dashed border-text-tertiary hover:border-text-secondary'
                              }`}
                              onClick={() => startEdit(rowIndex, colKey, cellValue)}
                              title={amountLabel || `Set ${row.metric} target for ${currentMonthLabels[colIndex]}`}
                            >
                              {cellValue ? amountLabel : 'Set target'}
                            </button>
                          );
                        })()}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center">
                    <div className="w-8 h-8"></div>
                  </td>

                </tr>
              ))}

              {/* Last Updated Summary Row */}
              <tr className="border-t border-border/50 bg-bg-elevated">
                <td className="py-2.5 px-3 font-medium text-text-secondary sticky left-0 z-10 bg-bg-elevated border-r border-border">
                  Last Updated
                </td>
                {currentMonthColumns.map((colKey) => (
                  <td key={`lastupdate-${colKey}`} className="py-2.5 px-2 text-center text-xs text-text-tertiary bg-bg-elevated">
                    {/* Show most recent update time for this column across all metrics */}
                    {monthlyTargets.find(target => (target as any)[colKey] && (target as any)[colKey] !== '')?.lastUpdated || 'Never'}
                  </td>
                ))}
                <td className="py-2.5 px-2 text-center text-xs text-text-tertiary">
                  <div className="w-8 h-8"></div>
                </td>
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
          promptId="target-intelligence"
        />
      </div>

      {/* Add Month Confirmation Dialog */}
      {showAddMonthDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Add New Month Column</h3>
            <p className="text-sm text-text-secondary mb-6">
              This will add a new month column after {currentMonthLabels[currentMonthLabels.length - 1]}. 
              All target rows will get an empty input field for this new month.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddMonthDialog(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary border border-border rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addNewMonth}
                className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue-light transition-colors"
              >
                Add Month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}