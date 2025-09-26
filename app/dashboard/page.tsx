'use client';

import { useWalletStore, useBasketStore } from '@/lib/store';
import { PriceTicker } from '@/components/ui/price-ticker';
import { BasketCard } from '@/components/ui/basket-card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const isConnected = useWalletStore(state => state.isConnected);
  const { userBaskets, publicBaskets } = useBasketStore();

  useEffect(() => {
    if (!isConnected) {
      redirect('/');
    }
  }, [isConnected]);

  if (!isConnected) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Manage your FX baskets and track performance</p>
        </div>

        {/* Live Prices */}
        <PriceTicker className="mb-8" />

        {/* User Baskets Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">My Baskets</h2>
            <Link href="/create">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Basket
              </Button>
            </Link>
          </div>

          {userBaskets.length === 0 ? (
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-12 text-center">
              <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No baskets minted yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first currency basket to start tracking performance
              </p>
              <Link href="/create">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Basket
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userBaskets.map((basket) => (
                <BasketCard key={basket.id} basket={basket} showCreator={false} />
              ))}
            </div>
          )}
        </section>

        {/* Public Baskets Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Popular Baskets</h2>
            <Link href="/baskets">
              <Button variant="outline" className="border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800">
                View All
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicBaskets.slice(0, 6).map((basket) => (
              <BasketCard key={basket.id} basket={basket} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}