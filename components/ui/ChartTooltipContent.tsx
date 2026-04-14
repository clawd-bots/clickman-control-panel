'use client';

import * as React from 'react';
import type { TooltipContentProps } from 'recharts';

function isNumOrStr(v: unknown): v is number | string {
  return typeof v === 'number' || typeof v === 'string';
}

function defaultFormatter(value: unknown) {
  return Array.isArray(value) && isNumOrStr(value[0]) && isNumOrStr(value[1])
    ? `${value[0]} ~ ${value[1]}`
    : value;
}

/** Mirrors Recharts DefaultTooltipContent sorting without depending on es-toolkit. */
function sortTooltipPayload<T extends { dataKey?: unknown; name?: unknown; value?: unknown }>(
  payload: readonly T[],
  itemSorter: TooltipContentProps['itemSorter'],
): T[] {
  if (itemSorter == null) {
    return [...payload];
  }
  if (typeof itemSorter === 'function') {
    const sortFn = itemSorter as unknown as (item: T) => number | string | undefined;
    return [...payload].sort((a, b) => {
      const va = sortFn(a);
      const vb = sortFn(b);
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb));
    });
  }
  if (itemSorter === 'name') {
    return [...payload].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
  }
  if (itemSorter === 'dataKey') {
    return [...payload].sort((a, b) => String(a.dataKey ?? '').localeCompare(String(b.dataKey ?? '')));
  }
  if (itemSorter === 'value') {
    return [...payload].sort((a, b) => {
      const va = Number(a.value);
      const vb = Number(b.value);
      return (Number.isFinite(va) ? va : 0) - (Number.isFinite(vb) ? vb : 0);
    });
  }
  return [...payload];
}

/**
 * Recharts tooltip with a small color swatch per series (stroke/fill) and support for itemSorter.
 */
export function ChartTooltipContent(props: TooltipContentProps) {
  const {
    active,
    payload,
    label,
    formatter,
    itemSorter,
    separator = ' : ',
    contentStyle,
    itemStyle,
    labelStyle,
    labelFormatter,
  } = props;

  if (!active || !payload?.length) {
    return null;
  }

  const sortedPayload = sortTooltipPayload(payload, itemSorter);

  let finalLabel: React.ReactNode = label;
  if (labelFormatter) {
    finalLabel = labelFormatter(label, payload);
  }

  const hasLabel = label != null && label !== '';

  return (
    <div className="recharts-default-tooltip" style={{ margin: 0, padding: 10, whiteSpace: 'nowrap', ...contentStyle }}>
      {hasLabel && (
        <p className="recharts-tooltip-label" style={{ margin: 0, ...labelStyle }}>
          {finalLabel}
        </p>
      )}
      <ul className="recharts-tooltip-item-list" style={{ padding: 0, margin: 0 }}>
        {sortedPayload.map((entry, i) => {
          if (entry.type === 'none') return null;
          const { value, name } = entry;
          const finalFormatter = entry.formatter || formatter || defaultFormatter;
          let finalValue: React.ReactNode = value;
          let finalName: React.ReactNode = name;
          const formatted = finalFormatter(value, name, entry, i, payload);
          if (Array.isArray(formatted)) {
            const [v, n] = formatted as [React.ReactNode, React.ReactNode];
            finalValue = v;
            finalName = n;
          } else if (formatted != null) {
            finalValue = formatted as React.ReactNode;
          } else {
            return null;
          }
          const swatchColor = entry.color ?? entry.stroke ?? entry.fill;
          const showName = isNumOrStr(finalName);
          return (
            <li
              key={`tooltip-item-${i}`}
              className="recharts-tooltip-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                paddingTop: 4,
                paddingBottom: 4,
                color: 'var(--color-text-primary)',
                ...itemStyle,
              }}
            >
              {swatchColor ? (
                <span
                  className="recharts-tooltip-item-swatch shrink-0"
                  style={{
                    width: 12,
                    height: 3,
                    backgroundColor: swatchColor,
                    borderRadius: 2,
                  }}
                  aria-hidden
                />
              ) : null}
              {showName ? <span className="recharts-tooltip-item-name">{finalName}</span> : null}
              {showName ? <span className="recharts-tooltip-item-separator">{separator}</span> : null}
              <span className="recharts-tooltip-item-value">{finalValue}</span>
              {entry.unit ? <span className="recharts-tooltip-item-unit">{entry.unit}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
