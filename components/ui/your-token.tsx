'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, DollarSign, Euro, PoundSterling, JapaneseYen as Yen, Banknote, Coins } from 'lucide-react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import { Skeleton } from './skeleton';
import { Button } from './button';

const tokenIcons: Record<string, JSX.Element> = {
    USD: <DollarSign className="h-6 w-6 text-green-500" />,
    EUR: <Euro className="h-6 w-6 text-blue-500" />,
    GBP: <PoundSterling className="h-6 w-6 text-purple-500" />,
    JPY: <Yen className="h-6 w-6 text-red-500" />,
    INR: <Banknote className="h-6 w-6 text-orange-500" />,
    CHF: <Coins className="h-6 w-6 text-yellow-500" />,
};

// Contract addresses (replace with env variables if needed)
const tokenContracts = [
    { symbol: 'USD', address: '0xA917e1B9265F1F5AB7DBFd1F8875931bA0842ddC' },
    { symbol: 'EUR', address: '0x591410442a00E077f54c04AB4A9B686303C10431' },
    { symbol: 'GBP', address: '0xE3e37BaFf1Cf0fE383a5eF9dF65381618751cA34' },
    { symbol: 'JPY', address: '0x2eDe85B1C710301F75A40c6428DcE8826210f9D2' },
    { symbol: 'INR', address: '0x5733FAd1A99329666F5468F9b8F9113833740971' },
    { symbol: 'CHF', address: '0x1c88E6B275e9FcFCbc95BD494b97394bf41b8517' },
];

// Minimal ERC20 ABI
const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];

type TokenBalance = {
    symbol: string;
    balance: number;
};

export function YourTokens() {
    const [balances, setBalances] = useState<TokenBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [account, setAccount] = useState<string | null>(null);

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
            } catch (error) {
                console.error("Failed to connect wallet:", error);
            }
        } else {
            alert("Please install MetaMask.");
        }
    };

    const fetchBalances = async (user: string) => {
        try {
            setIsLoading(true);
            const provider = new BrowserProvider(window.ethereum);

            const results = await Promise.all(
                tokenContracts.map(async (token) => {
                    try {
                        const contract = new Contract(token.address, erc20Abi, provider);
                        const bal = await contract.balanceOf(user);
                        const balance = parseFloat(formatUnits(bal, 18)); // assuming 18 decimals
                        return { symbol: token.symbol, balance };
                    } catch (err) {
                        console.error(`Error fetching ${token.symbol} balance:`, err);
                        return { symbol: token.symbol, balance: 0 };
                    }
                })
            );

            setBalances(results);
        } catch (err) {
            console.error("Error fetching balances:", err);
            setBalances(tokenContracts.map(t => ({ symbol: t.symbol, balance: 0 })));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (account) {
            fetchBalances(account);
        }
    }, [account]);

    useEffect(() => {
        const checkConnection = async () => {
            if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                } else {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        checkConnection();

        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accs: string[]) => {
                if (accs.length > 0) {
                    setAccount(accs[0]);
                } else {
                    setAccount(null);
                    setBalances([]);
                }
            });
        }
    }, []);

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center">
                    <Wallet className="h-5 w-5 mr-2 text-blue-500" />
                    Your Tokens
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-lg bg-slate-900/50" />
                        ))
                    ) : !account ? (
                        <div className="col-span-full text-center text-gray-400 py-8 flex flex-col items-center gap-4">
                            <p>Please connect your wallet to see your token balances.</p>
                            <Button onClick={connectWallet}>Connect Wallet</Button>
                        </div>
                    ) : (
                        balances.map((token) => (
                            <div
                                key={token.symbol}
                                className={`p-4 rounded-lg border transition-all hover:border-slate-600 ${token.balance > 0
                                    ? 'bg-slate-900/50 border-slate-700'
                                    : 'bg-slate-900/20 border-slate-800'
                                    }`}
                            >
                                <div className="flex items-center space-x-3 mb-3">
                                    {tokenIcons[token.symbol]}
                                    <div>
                                        <div className="text-white font-medium">{token.symbol}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-sm">Balance:</span>
                                        <span className={`font-semibold ${token.balance > 0 ? 'text-white' : 'text-gray-500'}`}>
                                            {token.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                        </span>
                                    </div>
                                    {token.balance === 0 && (
                                        <div className="text-center py-2">
                                            <span className="text-gray-500 text-xs">No balance</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
