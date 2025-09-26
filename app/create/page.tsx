'use client';

import { useWalletStore, useBasketStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Minus, DollarSign, Percent, Clock } from 'lucide-react';
import Link from 'next/link';
import { redirect, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserBalance, Basket, TokenAllocation } from '@/lib/types';

export default function CreateBasket() {
  const isConnected = useWalletStore(state => state.isConnected);
  const { userBalances, addBasket } = useBasketStore();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    lockDuration: 30,
  });

  const [selectedTokens, setSelectedTokens] = useState<{
    symbol: string;
    weight: number;
    amount: number;
  }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      redirect('/');
    }
  }, [isConnected]);

  if (!isConnected) {
    return null;
  }

  const eligibleTokens = userBalances.filter(balance => balance.eligible);
  const totalWeight = selectedTokens.reduce((sum, token) => sum + token.weight, 0);
  const isValidForm = formData.name && formData.description && selectedTokens.length > 0 && totalWeight === 100;

  const addToken = () => {
    if (eligibleTokens.length > selectedTokens.length) {
      const availableToken = eligibleTokens.find(
        token => !selectedTokens.some(selected => selected.symbol === token.symbol)
      );
      if (availableToken) {
        setSelectedTokens([...selectedTokens, {
          symbol: availableToken.symbol,
          weight: 0,
          amount: 0,
        }]);
      }
    }
  };

  const removeToken = (index: number) => {
    setSelectedTokens(selectedTokens.filter((_, i) => i !== index));
  };

  const updateToken = (index: number, field: 'symbol' | 'weight' | 'amount', value: string | number) => {
    const updated = [...selectedTokens];
    if (field === 'symbol') {
      updated[index].symbol = value as string;
      // Reset amount when symbol changes
      updated[index].amount = 0;
    } else if (field === 'weight') {
      updated[index].weight = Number(value);
    } else {
      updated[index].amount = Number(value);
    }
    setSelectedTokens(updated);
  };

  const getMaxAmount = (symbol: string) => {
    const balance = userBalances.find(b => b.symbol === symbol);
    return balance?.balance || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidForm) return;

    setIsSubmitting(true);

    try {
      // Mock smart contract interaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      const tokens: TokenAllocation[] = selectedTokens.map(token => ({
        ...token,
        currentPrice: 1, // Mock current price
        pnl: 0,
        pnlPercentage: 0,
      }));

      const totalValue = selectedTokens.reduce((sum, token) => sum + token.amount, 0);

      const newBasket: Basket = {
        id: `user-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        tokens,
        performance: 0,
        totalValue,
        createdAt: new Date().toISOString(),
        lockDuration: formData.lockDuration,
        creator: '0x' + Math.random().toString(16).substr(2, 40),
        isPublic: false,
      };

      addBasket(newBasket);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to create basket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create New Basket</h1>
          <p className="text-gray-400">Design your custom currency portfolio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Basket Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., My Global Portfolio"
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your investment strategy..."
                  className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockDuration" className="text-white">Lock Duration (Days)</Label>
                <Select
                  value={formData.lockDuration.toString()}
                  onValueChange={(value) => setFormData({...formData, lockDuration: parseInt(value)})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Token Balances */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Available Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {userBalances.map((balance) => (
                  <div
                    key={balance.symbol}
                    className={`p-4 rounded-lg border ${
                      balance.eligible 
                        ? 'bg-slate-900/50 border-slate-700' 
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{balance.symbol}</span>
                      {balance.eligible ? (
                        <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                          Eligible
                        </span>
                      ) : (
                        <span className="text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded">
                          Not Eligible
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-white">
                      {balance.balance.toLocaleString()}
                    </div>
                    {balance.swappedFrom && (
                      <div className="text-xs text-gray-400">
                        From {balance.swappedFrom}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Token Selection */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Token Allocation</CardTitle>
              <Button
                type="button"
                onClick={addToken}
                disabled={selectedTokens.length >= eligibleTokens.length}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Token
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTokens.map((token, index) => {
                const maxAmount = getMaxAmount(token.symbol);
                
                return (
                  <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label className="text-white">Token</Label>
                        <Select
                          value={token.symbol}
                          onValueChange={(value) => updateToken(index, 'symbol', value)}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            {eligibleTokens.map((balance) => (
                              <SelectItem 
                                key={balance.symbol} 
                                value={balance.symbol}
                                disabled={selectedTokens.some((t, i) => t.symbol === balance.symbol && i !== index)}
                              >
                                {balance.symbol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white">Weight (%)</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={token.weight}
                            onChange={(e) => updateToken(index, 'weight', e.target.value)}
                            min="0"
                            max="100"
                            className="bg-slate-800 border-slate-600 text-white pr-8"
                          />
                          <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white">Amount</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={token.amount}
                            onChange={(e) => updateToken(index, 'amount', e.target.value)}
                            min="0"
                            max={maxAmount}
                            className="bg-slate-800 border-slate-600 text-white pr-8"
                          />
                          <DollarSign className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        <div className="text-xs text-gray-400">
                          Max: {maxAmount.toLocaleString()}
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        onClick={() => removeToken(index)}
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-500 hover:bg-red-500/10"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {selectedTokens.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Click "Add Token" to start building your basket
                </div>
              )}

              {selectedTokens.length > 0 && (
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Total Weight:</span>
                    <span className={`text-lg font-bold ${
                      totalWeight === 100 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {totalWeight}%
                    </span>
                  </div>
                  {totalWeight !== 100 && (
                    <p className="text-sm text-red-500 mt-2">
                      Total weight must equal 100%
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isValidForm || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Basket...
                </>
              ) : (
                'Create Basket'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}