'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronDown, Loader2, Plus } from 'lucide-react';
import { ethers } from 'ethers';
import { useWalletStore } from '@/lib/store';

// Mock token data - replace with your actual token fetching logic
const availableTokens = [
    { symbol: 'USDC', name: 'USD Coin', address: '0x...' },
    { symbol: 'INR', name: 'Indian Rupee', address: '0x...' },
    { symbol: 'EUR', name: 'Euro', address: '0x...' },
    { symbol: 'GBP', name: 'British Pound', address: '0x...' },
    { symbol: 'JPY', name: 'Japanese Yen', address: '0x...' },
    { symbol: 'CHF', name: 'Swiss Franc', address: '0x...' },
];

interface LiquidityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LiquidityModal({ isOpen, onClose }: LiquidityModalProps) {
    const [amountA, setAmountA] = useState('');
    const [amountB, setAmountB] = useState('');
    const [tokenA, setTokenA] = useState('USDC');
    const [tokenB, setTokenB] = useState('INR');
    const [isLoading, setIsLoading] = useState(false);
    const [transactionStatus, setTransactionStatus] = useState<{ success: boolean; message: string } | null>(null);
    const { address } = useWalletStore();

    // Mock balances - replace with actual balance fetching
    const [balances, setBalances] = useState<Record<string, string>>({
        USDC: '1000.00',
        INR: '50000.00',
        EUR: '800.00',
        GBP: '750.00',
        JPY: '120000.00',
        CHF: '900.00',
    });

    const handleAddLiquidity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amountA || !amountB || !tokenA || !tokenB || !address) return;

        setIsLoading(true);
        setTransactionStatus(null);

        try {
            // This is a placeholder. You'll need to implement:
            // 1. Get the correct FiatSwap contract address for the tokenA/tokenB pair.
            // 2. Get the ABI for FiatSwap and the ERC20 token.
            // 3. Create contract instances.
            // 4. Approve the FiatSwap contract to spend tokenA and tokenB.
            // 5. Call the `addLiquidity` function on the FiatSwap contract.

            console.log(`Adding liquidity: ${amountA} ${tokenA} and ${amountB} ${tokenB}`);

            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));

            setTransactionStatus({ success: true, message: 'Liquidity added successfully!' });
            setTimeout(() => handleClose(), 3000);

        } catch (error: any) {
            console.error('Failed to add liquidity:', error);
            setTransactionStatus({ success: false, message: error.message || 'Failed to add liquidity.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setAmountA('');
            setAmountB('');
            setTransactionStatus(null);
            onClose();
        }
    };

    const balanceA = balances[tokenA] ?? '0';
    const balanceB = balances[tokenB] ?? '0';

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md p-6 rounded-2xl">
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-center">Add Liquidity</h2>
                    <p className="text-sm text-gray-400 text-center">Provide two tokens to earn fees.</p>

                    {/* Token A Input */}
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <Input
                                type="number"
                                value={amountA}
                                onChange={(e) => setAmountA(e.target.value)}
                                placeholder="0.0"
                                className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:ring-0 flex-1"
                                disabled={isLoading}
                            />
                            <Select value={tokenA} onValueChange={setTokenA} disabled={isLoading}>
                                <SelectTrigger className="bg-gray-700 border-none rounded-full px-3 py-2 w-auto ml-4 [&>svg]:hidden">
                                    <div className="flex items-center">
                                        <span className="text-white font-medium mr-1">{tokenA}</span>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    {availableTokens.map((token) => (
                                        <SelectItem key={token.symbol} value={token.symbol} className="text-white hover:bg-gray-700">
                                            {token.symbol}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                            Balance: {balanceA}
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <Plus className="h-6 w-6 text-gray-500" />
                    </div>

                    {/* Token B Input */}
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <Input
                                type="number"
                                value={amountB}
                                onChange={(e) => setAmountB(e.target.value)}
                                placeholder="0.0"
                                className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:ring-0 flex-1"
                                disabled={isLoading}
                            />
                            <Select value={tokenB} onValueChange={setTokenB} disabled={isLoading}>
                                <SelectTrigger className="bg-gray-700 border-none rounded-full px-3 py-2 w-auto ml-4 [&>svg]:hidden">
                                    <div className="flex items-center">
                                        <span className="text-white font-medium mr-1">{tokenB}</span>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    {availableTokens.map((token) => (
                                        <SelectItem key={token.symbol} value={token.symbol} className="text-white hover:bg-gray-700">
                                            {token.symbol}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                            Balance: {balanceB}
                        </div>
                    </div>

                    {/* Transaction Status */}
                    {transactionStatus && (
                        <div className={`rounded-lg p-3 text-center text-sm ${transactionStatus.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {transactionStatus.message}
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        onClick={handleAddLiquidity}
                        disabled={!amountA || !amountB || isLoading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-4 rounded-xl text-lg font-semibold"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Processing...
                            </>
                        ) : (
                            'Add Liquidity'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}