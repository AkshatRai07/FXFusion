import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { HermesClient } from '@pythnetwork/hermes-client';
import contractJson from "@/contracts/out/App.sol/App.json";

// --- Configuration ---
const APP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_App || "";
const RPC_URL = process.env.RPC_URL || "https://testnet.evm.nodes.onflow.org";

const appContract = new ethers.Contract(APP_CONTRACT_ADDRESS, contractJson.abi, new ethers.JsonRpcProvider(RPC_URL));

export async function POST(request: NextRequest) {
    try {
        const { tokenNameA, tokenNameB, amountA } = await request.json();
        if (!tokenNameA || !tokenNameB || !amountA) {
            return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
        }

        const amountAWei = ethers.parseEther(amountA);
        const SCALE = 10n ** 18n;

        // Fetch prices directly from the contract's view function for accuracy
        const priceA = await appContract.getNormalizedPrice(await appContract.nameToId(tokenNameA));
        const priceB = await appContract.getNormalizedPrice(await appContract.nameToId(tokenNameB));

        if (priceA === 0n || priceB === 0n) {
             return NextResponse.json({ success: false, error: 'Could not fetch valid prices for pair' }, { status: 500 });
        }

        const rateAtoB = (priceA * SCALE) / priceB;
        const amountBWei = (amountAWei * rateAtoB) / SCALE;

        return NextResponse.json({
            success: true,
            data: {
                amountB: ethers.formatEther(amountBWei)
            }
        });

    } catch (error: any) {
        console.error('Error in calculate-liquidity API:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}