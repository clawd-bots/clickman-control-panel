'use client';
import { getDataSourceClass, getDataSourceIcon } from '@/lib/dataSourceUtils';

interface DataSourceProps {
  source: string;
  className?: string;
  showIcon?: boolean;
}

export default function DataSource({ source, className = '', showIcon = true }: DataSourceProps) {
  const colorClass = getDataSourceClass(source);
  const icon = showIcon ? getDataSourceIcon(source) : '';
  
  return (
    <span className={`text-xs font-medium ${colorClass} ${className}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {source}
    </span>
  );
}