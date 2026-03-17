'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Currency = '₱' | '$';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertValue: (value: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Conversion rate: 1 USD = 55 PHP (approximate)
const USD_TO_PHP_RATE = 55;

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<Currency>('₱');

  // Convert values based on current currency
  const convertValue = (value: number): number => {
    // All data is stored in PHP (₱), so we convert to USD when needed
    if (currency === '$') {
      return value / USD_TO_PHP_RATE;
    }
    return value;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertValue }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}