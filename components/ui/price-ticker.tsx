'use client';

import { useEffect, useState } from 'react';
import { usePriceStore } from '@/lib/store';
import { PriceData } from '@/lib/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

// CSS for the visual flash effect when a price updates
const styles = `
  .price-card-flash {
    animation: flash 0.7s ease-out;
  }

  @keyframes flash {
    0% { background-color: #4A5568; } /* A highlight color */
    100% { background-color: #2D3748; } /* Your default card background color */
  }
`;

// This interface matches the data structure sent by our new API route
interface ApiPriceData {
  symbol: string;
  price: number;
  change24h: number;
}

interface PriceTickerProps {
  symbols?: string[];
  className?: string;
}

export function PriceTicker({
  symbols = ['BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'FLOW/USD', 'USD/CHF', 'USD/INR', 'USD/JPY'],
  className = ''
}: PriceTickerProps) {
  const { prices, updatePrices } = usePriceStore();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [priceChanges, setPriceChanges] = useState<Record<string, boolean>>({});

  useEffect(() => {
    console.log("PriceTicker: Connecting to backend price stream at /api/prices...");
    const eventSource = new EventSource('/api/prices');

    eventSource.onopen = () => {
      console.log("✅ PriceTicker: Connection to backend stream established.");
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const pythPrices: Record<string, ApiPriceData> = JSON.parse(event.data);
        const storePrices: Record<string, PriceData> = {};
        const updatedSymbols: Record<string, boolean> = {};

        Object.entries(pythPrices).forEach(([symbol, data]) => {
          storePrices[symbol] = {
            symbol: data.symbol,
            price: data.price,
            change24h: data.change24h,
          };
          updatedSymbols[symbol] = true;
        });

        if (Object.keys(storePrices).length > 0) {
          updatePrices(storePrices);
          setLastUpdate(Date.now());
          setPriceChanges(updatedSymbols);

          setTimeout(() => setPriceChanges({}), 700);
        }
      } catch (error) {
        console.error("PriceTicker: Failed to parse price data from backend.", error);
      }
    };

    // CHANGED: Removed eventSource.close() from the error handler.
    // This allows the browser's EventSource to automatically attempt reconnection.
    eventSource.onerror = (error) => {
      console.error("PriceTicker: Error with backend stream connection. The browser will attempt to reconnect.", error);
      setIsConnected(false);
      // DO NOT close the connection here. Let the browser handle it.
    };

    return () => {
      console.log("PriceTicker: Unmounting component, closing backend connection.");
      setIsConnected(false);
      eventSource.close();
    };
  }, [updatePrices]);

  const formatPrice = (symbol: string, price: number): string => {
    if (symbol.includes('BTC')) return price.toFixed(0);
    if (symbol.includes('ETH')) return price.toFixed(2);
    if (symbol.includes('FLOW')) return price.toFixed(4);
    if (symbol.includes('INR') || symbol.includes('JPY')) return price.toFixed(2);
    if (symbol.includes('CHF') || symbol.includes('EUR') || symbol.includes('GBP')) return price.toFixed(4);
    return price.toFixed(4);
  };

  const getCurrencySymbol = (symbol: string): string => {
    if (symbol.includes('USD') && !symbol.startsWith('USD')) return '$';
    if (symbol.includes('EUR')) return '€';
    if (symbol.includes('GBP')) return '£';
    if (symbol.includes('JPY')) return '¥';
    if (symbol.includes('INR')) return '₹';
    if (symbol.includes('CHF')) return 'CHF ';
    return '';
  };

  return (
    <>
      <style>{styles}</style>
      <div className={`bg-slate-800/50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Live Crypto & FX Rates</h3>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {symbols.map((symbol) => {
            const price = prices[symbol];

            if (!price) {
              return (
                <div key={symbol} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 animate-pulse">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">{symbol}</span>
                  </div>
                  <div className="h-6 bg-gray-600 rounded mb-2"></div>
                  <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                </div>
              );
            }

            const isPositive = price.change24h >= 0;
            const cardClassName = `bg-slate-900/50 rounded-lg p-3 border border-slate-700 transition-colors duration-200 ${priceChanges[symbol] ? 'price-card-flash' : ''}`;

            return (
              <div key={symbol} className={cardClassName}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{symbol}</span>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-xl font-bold text-white">
                  {getCurrencySymbol(symbol)}{formatPrice(symbol, price.price)}
                </div>
                {price.change24h !== 0 && (
                  <div className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{price.change24h.toFixed(2)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Last data received: {new Date(lastUpdate).toLocaleTimeString()}
          {' | '}
          Prices in store: {Object.keys(prices).length}
        </div>
      </div>
    </>
  );
}