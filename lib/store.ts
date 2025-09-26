import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Basket, PriceData, UserBalance } from './types';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletState {
  isConnected: boolean;
  address: string | null;
  provider: any;
  signer: any;
  connect: () => Promise<void>;
  disconnect: () => void;
}

interface PriceState {
  prices: Record<string, PriceData>;
  updatePrice: (symbol: string, data: PriceData) => void;
  updatePrices: (prices: Record<string, PriceData>) => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  prices: {},
  updatePrice: (symbol, data) => {
    console.log("Store: Updating single price:", symbol, data);
    set((state) => ({
      prices: { ...state.prices, [symbol]: data },
    }));
  },
  updatePrices: (prices) => {
    // This console log will now show the clean, incoming price batches
    console.log("Store: Updating multiple prices:", prices);
    set((state) => ({
      // Merging with the previous state is still correct for batch updates
      prices: { ...state.prices, ...prices },
    }));
  },
}));

interface BasketState {
  userBaskets: Basket[];
  publicBaskets: Basket[];
  selectedBasket: Basket | null;
  userBalances: UserBalance[];
  addBasket: (basket: Basket) => void;
  setSelectedBasket: (basket: Basket | null) => void;
  updateUserBalances: (balances: UserBalance[]) => void;
}

export const useBasketStore = create<BasketState>()(
  persist(
    (set) => ({
      userBaskets: [],
      publicBaskets: [
        {
          id: '1',
          name: 'Global Growth Basket',
          description: 'Diversified exposure to major global currencies with growth potential',
          tokens: [
            { symbol: 'USD', weight: 40, amount: 1000, currentPrice: 1, pnl: 150, pnlPercentage: 15 },
            { symbol: 'EUR', weight: 30, amount: 800, currentPrice: 1.08, pnl: 80, pnlPercentage: 10 },
            { symbol: 'JPY', weight: 20, amount: 120000, currentPrice: 0.0067, pnl: -20, pnlPercentage: -2.5 },
            { symbol: 'GBP', weight: 10, amount: 200, currentPrice: 1.27, pnl: 25, pnlPercentage: 12.5 },
          ],
          performance: 8.5,
          totalValue: 2500,
          createdAt: '2024-01-15',
          lockDuration: 30,
          creator: '0x742d35Cc6Ab4e97f7...a5B',
          isPublic: true,
        },
        {
          id: '2',
          name: 'Asian Markets Focus',
          description: 'Strategic allocation across high-growth Asian currencies',
          tokens: [
            { symbol: 'USD', weight: 30, amount: 750, currentPrice: 1, pnl: 100, pnlPercentage: 13.3 },
            { symbol: 'JPY', weight: 35, amount: 150000, currentPrice: 0.0067, pnl: 45, pnlPercentage: 4.5 },
            { symbol: 'CNY', weight: 25, amount: 1800, currentPrice: 0.14, pnl: 30, pnlPercentage: 12 },
            { symbol: 'INR', weight: 10, amount: 8500, currentPrice: 0.012, pnl: 15, pnlPercentage: 15 },
          ],
          performance: 12.2,
          totalValue: 2000,
          createdAt: '2024-01-20',
          lockDuration: 60,
          creator: '0x8ba1f109551bD...c7D',
          isPublic: true,
        },
        {
          id: '3',
          name: 'Conservative Income',
          description: 'Low-risk stable currency allocation for steady returns',
          tokens: [
            { symbol: 'USD', weight: 50, amount: 1250, currentPrice: 1, pnl: 50, pnlPercentage: 4 },
            { symbol: 'EUR', weight: 30, amount: 900, currentPrice: 1.08, pnl: 35, pnlPercentage: 3.9 },
            { symbol: 'CHF', weight: 20, amount: 460, currentPrice: 1.09, pnl: 20, pnlPercentage: 4.3 },
          ],
          performance: 4.1,
          totalValue: 2500,
          createdAt: '2024-01-25',
          lockDuration: 90,
          creator: '0x4Bbeeb066eD0...f12',
          isPublic: true,
        },
      ],
      selectedBasket: null,
      userBalances: [
        { symbol: 'USD', balance: 5000, swappedFrom: 'INR', eligible: true },
        { symbol: 'EUR', balance: 2000, swappedFrom: 'USD', eligible: true },
        { symbol: 'JPY', balance: 150000, swappedFrom: 'USD', eligible: true },
        { symbol: 'INR', balance: 80000, swappedFrom: undefined, eligible: false },
      ],
      addBasket: (basket) =>
        set((state) => ({
          userBaskets: [...state.userBaskets, basket],
        })),
      setSelectedBasket: (basket) => set({ selectedBasket: basket }),
      updateUserBalances: (balances) => set({ userBalances: balances }),
    }),
    { name: 'basket-storage' }
  )
);

export const useWalletStore = create<WalletState>((set, get) => ({
  isConnected: false,
  address: null,
  provider: null,
  signer: null,
  connect: async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        set({
          isConnected: true,
          address,
          provider,
          signer,
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  },
  disconnect: () => {
    set({
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
    });
  },
}));