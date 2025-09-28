'use client';

import { useWalletStore, useBasketStore } from '@/lib/store';
import { BasketCard } from '@/components/ui/basket-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ListFilter as Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Baskets() {
  const isConnected = useWalletStore(state => state.isConnected);
  const { userBaskets } = useBasketStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'performance' | 'value' | 'created'>('performance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!isConnected) {
      redirect('/');
    }
  }, [isConnected]);

  if (!isConnected) {
    return null;
  }

  const filteredBaskets = userBaskets
    .filter(basket =>
      basket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      basket.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'performance':
          aValue = a.performance;
          bValue = b.performance;
          break;
        case 'value':
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">All Baskets</h1>
          <p className="text-gray-400">Explore currency baskets from the FXFusion community</p>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search baskets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-700 text-white placeholder-gray-400"
              />
            </div>

            {/* Sort Options */}
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'performance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('performance')}
                className={sortBy === 'performance' ? 'bg-blue-600' : 'border-slate-700 text-gray-300'}
              >
                Performance
              </Button>
              <Button
                variant={sortBy === 'value' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('value')}
                className={sortBy === 'value' ? 'bg-blue-600' : 'border-slate-700 text-gray-300'}
              >
                Value
              </Button>
              <Button
                variant={sortBy === 'created' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('created')}
                className={sortBy === 'created' ? 'bg-blue-600' : 'border-slate-700 text-gray-300'}
              >
                Newest
              </Button>

              {/* Sort Direction */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800"
              >
                {sortOrder === 'desc' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-gray-400">
            Showing {filteredBaskets.length} of {userBaskets.length} baskets
          </p>
        </div>

        {/* Baskets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBaskets.map((basket) => (
            <BasketCard key={basket.id} basket={basket} />
          ))}
        </div>

        {filteredBaskets.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No baskets found</h3>
            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}