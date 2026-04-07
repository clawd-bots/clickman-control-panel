'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Currency = '₱' | '$';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertValue: (value: number) => number;
  exchangeRate: number;
  rateLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Fallback rate if API fails
const FALLBACK_USD_TO_PHP_RATE = 57;

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<Currency>('₱');
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_USD_TO_PHP_RATE);
  const [rateLoading, setRateLoading] = useState(true);

  // Fetch live exchange rate on mount
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch('/api/exchange-rate');
        const data = await res.json();
        if (data.success && data.rate) {
          setExchangeRate(data.rate);
        }
      } catch {
        // Keep fallback rate
      } finally {
        setRateLoading(false);
      }
    }
    fetchRate();

    // Refresh rate every hour
    const interval = setInterval(fetchRate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Convert values based on current currency
  // All data from Triple Whale / APIs is in the shop's currency (PHP ₱ for andyou.ph)
  const convertValue = (value: number): number => {
    if (currency === '$') {
      return value / exchangeRate; // Convert PHP → USD
    }
    return value; // Already PHP
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convertValue, exchangeRate, rateLoading }}>
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
