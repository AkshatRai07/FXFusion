import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { HermesClient } from '@pythnetwork/hermes-client';
import contractJson from "@/contracts/out/App.sol/App.json"
const connection = new HermesClient("https://hermes.pyth.network", {});

// Contract configuration
const APP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_App || ""; // Add to your .env
// PRIVATE_KEY is no longer needed on the backend for this flow.
const RPC_URL = process.env.RPC_URL || "https://testnet.evm.nodes.onflow.org"; // Flow testnet

// Pyth Contract configuration on Flow EVM Testnet
const PYTH_CONTRACT_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43";
const PYTH_ABI = [
    "function getUpdateFee(bytes[] calldata updateData) public view returns (uint256 feeAmount)"
];

// App Contract ABI
const APP_ABI = contractJson.abi;

// Price IDs mapping
const priceIds = {
    FLOW_USD: "0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30",
    USD_CHF: "0x0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8",
    USD_INR: "0x0ac0f9a2886fc2dd708bc66cc2cea359052ce89d324f45d95fadbc6c4fcf1809",
    USD_YEN: "0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52",
    GBP_USD: "0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1",
    EUR_USD: "0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b",
    USDC_USD: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
};

export async function POST(request: NextRequest) {
    if (!APP_CONTRACT_ADDRESS) {
        console.error("Server configuration error: Make sure App is set in a .env.local file in the project root.");
        return NextResponse.json(
            { success: false, error: "Server configuration error. Check server logs." },
            { status: 500 }
        );
    }
    try {
        const { tokenSymbol, flowAmount } = await request.json();

        if (!tokenSymbol || !flowAmount) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const tokenMapping: { [key: string]: string } = {
            'USDC': 'fUSD', 'USD': 'fUSD', 'INR': 'fINR', 'EUR': 'fEUR',
            'GBP': 'fGBP', 'JPY': 'fYEN', 'CHF': 'fCHF'
        };
        const contractTokenName = tokenMapping[tokenSymbol];

        if (!contractTokenName) {
            return NextResponse.json({ success: false, error: 'Unsupported token' }, { status: 400 });
        }

        const priceUpdateData = await connection.getLatestPriceUpdates(Object.values(priceIds));
        if (!priceUpdateData.binary?.data) {
            throw new Error('Failed to fetch price update data');
        }
        const updateDataArray = priceUpdateData.binary.data.map((data: string) => `0x${data}`);

        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const pythContract = new ethers.Contract(PYTH_CONTRACT_ADDRESS, PYTH_ABI, provider);
        const updateFee = await pythContract.getUpdateFee(updateDataArray);
        const flowAmountWei = ethers.parseEther(flowAmount) + 100n;
        const totalValue = flowAmountWei + updateFee;

        const appInterface = new ethers.Interface(APP_ABI);
        const transactionData = appInterface.encodeFunctionData("buyTokensFromFlow", [
            contractTokenName,
            updateDataArray
        ]);

        return NextResponse.json({
            success: true,
            data: {
                to: APP_CONTRACT_ADDRESS,
                value: totalValue.toString(),
                data: transactionData,
            }
        });

    } catch (error: any) {
        console.error('Error in buy-tokens API:', error);
        return NextResponse.json({
            success: false,
            error: error.reason || error.message || 'Failed to prepare transaction',
        }, { status: 500 });
    }
}