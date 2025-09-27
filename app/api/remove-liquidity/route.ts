import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import contractJson from "@/contracts/out/App.sol/App.json";

// --- Configuration ---
const APP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_App || "";

// --- Initialization ---
const appInterface = new ethers.Interface(contractJson.abi);

/**
 * API route to prepare a 'removeLiquidity' transaction.
 * This is simpler than adding liquidity as it does not require a Pyth price update.
 */
export async function POST(request: NextRequest) {
    try {
        const { tokenNameA, tokenNameB, lpTokenAmount } = await request.json();

        // --- Input Validation ---
        if (!tokenNameA || !tokenNameB || !lpTokenAmount || parseFloat(lpTokenAmount) <= 0) {
            return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
        }
        if (tokenNameA === tokenNameB) {
            return NextResponse.json({ success: false, error: 'Tokens cannot be the same' }, { status: 400 });
        }

        // --- Encode Transaction Data ---
        const lpTokenAmountWei = ethers.parseEther(lpTokenAmount);
        const encodedTxData = appInterface.encodeFunctionData("removeLiquidity", [
            tokenNameA,
            tokenNameB,
            lpTokenAmountWei
        ]);
        
        // --- Return Transaction Object ---
        // The `removeLiquidity` function in the contract is not payable, so the value is '0'.
        return NextResponse.json({
            success: true,
            data: {
                to: APP_CONTRACT_ADDRESS,
                value: '0',
                data: encodedTxData,
            }
        });

    } catch (error: any) {
        console.error('Error in remove-liquidity API:', error);
        const message = error.reason || error.message || "An unexpected error occurred.";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
