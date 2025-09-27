import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { HermesClient } from '@pythnetwork/hermes-client';
import contractJson from "@/contracts/out/App.sol/App.json"
const connection = new HermesClient("https://hermes.pyth.network", {});

// Contract configuration
const APP_CONTRACT_ADDRESS = process.env.App || ""; // Add to your .env
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""; // Add to your .env
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
    if (!PRIVATE_KEY || !APP_CONTRACT_ADDRESS) {
        console.error("Server configuration error: Make sure PRIVATE_KEY and App are set in a .env.local file in the project root.");
        return NextResponse.json(
            { success: false, error: "Server configuration error. Check server logs." },
            { status: 500 }
        );
    }
    try {
        const { tokenSymbol, flowAmount } = await request.json();

        // Validate inputs
        if (!tokenSymbol || !flowAmount) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Map frontend token symbols to contract token names
        const tokenMapping: { [key: string]: string } = {
            'USDC': 'fUSD',
            'USD': 'fUSD',
            'INR': 'fINR',
            'EUR': 'fEUR',
            'GBP': 'fGBP',
            'JPY': 'fYEN',
            'CHF': 'fCHF'
        };

        const contractTokenName = tokenMapping[tokenSymbol];
        if (!contractTokenName) {
            return NextResponse.json(
                { success: false, error: 'Unsupported token' },
                { status: 400 }
            );
        }

        console.log(`Processing buy request: ${flowAmount} FLOW -> ${contractTokenName}`);

        // Get Pyth update data
        const priceUpdateData = await connection.getLatestPriceUpdates(Object.values(priceIds));

        if (!priceUpdateData.binary || !priceUpdateData.binary.data) {
            throw new Error('Failed to fetch price update data');
        }

        const updateDataArray = priceUpdateData.binary.data.map((data: string) => `0x${data}`);

        // Initialize provider and wallet
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // Initialize Pyth contract to get the update fee
        const pythContract = new ethers.Contract(PYTH_CONTRACT_ADDRESS, PYTH_ABI, provider);
        const updateFee = await pythContract.getUpdateFee(updateDataArray); // BigInt

        const flowAmountWei = ethers.parseEther(flowAmount); // BigInt

        // Log values for debugging
        console.log('updateFee (wei):', updateFee.toString());
        console.log('flowAmountWei (wei):', flowAmountWei.toString());

        // Calculate total value needed (update fee + FLOW for token purchase)
        const totalValue = flowAmountWei + updateFee; // BigInt addition

        console.log('Total value to send with transaction (wei):', totalValue.toString());

        // Initialize App contract
        const contract = new ethers.Contract(APP_CONTRACT_ADDRESS, APP_ABI, wallet);

        // Call the contract function
        try {
            const tx = await contract.buyTokensFromFlow(contractTokenName, updateDataArray, {
                value: totalValue
            });

            console.log('Transaction sent:', tx.hash);

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('Transaction confirmed in block:', receipt.blockNumber);

            return NextResponse.json({
                success: true,
                data: {
                    transactionHash: receipt.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    tokenName: contractTokenName,
                    flowAmount: flowAmount
                }
            });
        } catch (txError: any) {
            console.error('Contract call reverted:', txError);
            return NextResponse.json({
                success: false,
                error: txError.reason || txError.message || 'Transaction reverted',
                details: txError.code || 'Unknown error'
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error in buy-tokens API:', error);

        return NextResponse.json({
            success: false,
            error: error.reason || error.message || 'Transaction failed',
            details: error.code || 'Unknown error'
        }, { status: 500 });
    }
}