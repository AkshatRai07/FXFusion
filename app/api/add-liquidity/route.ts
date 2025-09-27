import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { HermesClient } from '@pythnetwork/hermes-client';
import contractJson from "@/contracts/out/App.sol/App.json";

// --- Configuration ---
const APP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_App || "";
const RPC_URL = process.env.RPC_URL || "https://testnet.evm.nodes.onflow.org";
const PYTH_HERMES_URL = "https://hermes.pyth.network"; // Mainnet Hermes endpoint

// --- Initializations ---
const provider = new ethers.JsonRpcProvider(RPC_URL);
const appContract = new ethers.Contract(APP_CONTRACT_ADDRESS, contractJson.abi, provider);
const hermesClient = new HermesClient(PYTH_HERMES_URL);
const appInterface = new ethers.Interface(contractJson.abi);

/**
 * API route to prepare an 'addLiquidity' transaction.
 * It fetches the required price updates from Pyth, calculates the fee,
 * and returns the encoded transaction data for the frontend to execute.
 */
export async function POST(request: NextRequest) {
    try {
        const { tokenNameA, tokenNameB, amountA } = await request.json();

        // --- Input Validation ---
        if (!tokenNameA || !tokenNameB || !amountA || parseFloat(amountA) <= 0) {
            return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
        }
        if (tokenNameA === tokenNameB) {
            return NextResponse.json({ success: false, error: 'Tokens cannot be the same' }, { status: 400 });
        }

        // --- Fetch Price IDs from Contract ---
        // We need the price feeds for the two tokens being added, plus FLOW to value the fee.
        const [priceIdA, priceIdB, flowPriceId] = await Promise.all([
            appContract.nameToId(tokenNameA),
            appContract.nameToId(tokenNameB),
            appContract.FLOW_USD() // Fetch the constant FLOW price feed ID from the contract
        ]);

        const priceIds = [priceIdA, priceIdB, flowPriceId];

        // --- Fetch Price Updates from Pyth Network using HermesClient ---
        const priceUpdates = await hermesClient.getLatestPriceUpdates(priceIds);
        
        // The binary property is an object containing the VAA data array.
        // We need to access the `data` array and convert the base64 VAAs to 0x-prefixed hex strings.
        if (!priceUpdates.binary || !Array.isArray(priceUpdates.binary.data)) {
            throw new Error("Could not retrieve binary price update data array from Pyth.");
        }

        const priceUpdateData = priceUpdates.binary.data.map(
            (vaa: string) => `0x${Buffer.from(vaa, "base64").toString("hex")}`
        );


        // --- Calculate Pyth Fee ---
        // The fee is returned from the Pyth contract itself.
        const pythContractAddress = await appContract.pyth();
        const pythContract = new ethers.Contract(pythContractAddress, ['function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 feeAmount)'], provider);
        const fee = await pythContract.getUpdateFee(priceUpdateData);

        // --- Encode Transaction Data ---
        const amountAWei = ethers.parseEther(amountA);
        const encodedTxData = appInterface.encodeFunctionData("addLiquidity", [
            tokenNameA,
            tokenNameB,
            amountAWei,
            priceUpdateData
        ]);

        // --- Return Transaction Object ---
        return NextResponse.json({
            success: true,
            data: {
                to: APP_CONTRACT_ADDRESS,
                value: fee.toString(), // The msg.value to be sent with the transaction
                data: encodedTxData,    // The encoded function call
            }
        });

    } catch (error: any) {
        console.error('Error in add-liquidity API:', error);
        // Provide a more user-friendly error message
        const message = error.reason || error.message || "An unexpected error occurred.";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}