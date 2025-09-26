'use client';

import { useEffect } from 'react';
import { usePriceStore } from '@/lib/store';
import { priceService } from '@/lib/price-service';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceTickerProps {
  symbols?: string[];
  className?: string;
}

export function PriceTicker({ symbols = ['EUR/USD', 'GBP/USD', 'JPY/USD', 'INR/USD'], className = '' }: PriceTickerProps) {
  const { prices, updatePrices } = usePriceStore();

  useEffect(() => {
    const unsubscribe = priceService.subscribe(updatePrices);
    return unsubscribe;
  }, [updatePrices]);

  return (
    <div className={`bg-slate-800/50 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Live Exchange Rates</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {symbols.map((symbol) => {
          const price = prices[symbol];
          if (!price) return null;

          const isPositive = price.change24h >= 0;
          const changePercent = (price.change24h / price.price) * 100;

          return (
            <div key={symbol} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{symbol}</span>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-xl font-bold text-white">
                {price.price.toFixed(4)}
              </div>
              <div className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}