import { NextResponse } from 'next/server';
import { HermesClient } from '@pythnetwork/hermes-client';

const connection = new HermesClient("https://hermes.pyth.network", {});

// Price IDs from your smart contract
const priceIds = {
    FLOW_USD: "0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30",
    USD_CHF: "0x0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8",
    USD_INR: "0x0ac0f9a2886fc2dd708bc66cc2cea359052ce89d324f45d95fadbc6c4fcf1809",
    USD_YEN: "0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52",
    GBP_USD: "0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1",
    EUR_USD: "0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b",
    USDC_USD: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
};

export async function GET() {
    try {
        // Get latest price updates for all price feeds
        const priceUpdates = await connection.getLatestPriceUpdates(Object.values(priceIds));

        // Parse price data
        const prices: { [key: string]: number } = {};

        priceUpdates.parsed?.forEach((priceUpdate) => {
            // Normalize price ID by adding 0x prefix if not present
            const priceId = priceUpdate.id.startsWith('0x') ? priceUpdate.id : `0x${priceUpdate.id}`;
            console.log(`Price ID: ${priceId}, Price: ${priceUpdate.price.price}, Expo: ${priceUpdate.price.expo}`);

            const price = Number(priceUpdate.price.price) * Math.pow(10, priceUpdate.price.expo);
            console.log(`Calculated price for ${priceId}: ${price}`);

            // Map price IDs to currency pairs
            if (priceId === priceIds.FLOW_USD) {
                prices.FLOW_USD = price;
                console.log('FLOW_USD price set:', price);
            } else if (priceId === priceIds.USD_CHF) {
                prices.USD_CHF = price;
            } else if (priceId === priceIds.USD_INR) {
                prices.USD_INR = price;
            } else if (priceId === priceIds.USD_YEN) {
                prices.USD_YEN = price;
            } else if (priceId === priceIds.GBP_USD) {
                prices.GBP_USD = price;
            } else if (priceId === priceIds.EUR_USD) {
                prices.EUR_USD = price;
            } else if (priceId === priceIds.USDC_USD) {
                prices.USDC_USD = price;
            }
        });

        console.log('All parsed prices:', prices);

        // Calculate FLOW to other currencies conversion rates
        const flowUsdPrice = prices.FLOW_USD;

        console.log('Final FLOW_USD Price:', flowUsdPrice);
        if (!flowUsdPrice || flowUsdPrice <= 0) {
            throw new Error('FLOW/USD price not available or invalid');
        }

        const conversionRates = {
            USDC: flowUsdPrice / (prices.USDC_USD || 1), // FLOW to USDC
            USD: flowUsdPrice, // FLOW to USD (direct)
            INR: flowUsdPrice * (prices.USD_INR || 83), // FLOW to INR
            CHF: flowUsdPrice * (prices.USD_CHF || 0.9), // FLOW to CHF
            JPY: flowUsdPrice * (prices.USD_YEN || 150), // FLOW to JPY
            EUR: flowUsdPrice / (prices.EUR_USD || 1.1), // FLOW to EUR
            GBP: flowUsdPrice / (prices.GBP_USD || 1.25), // FLOW to GBP
        };

        console.log('Calculated conversion rates:', conversionRates);

        return NextResponse.json({
            success: true,
            data: {
                flowUsdPrice,
                conversionRates,
                rawPrices: prices,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error fetching price feeds:', error);

        // Fallback rates in case of API failure
        const fallbackRates = {
            USDC: 0.3478, // Based on the actual FLOW price from logs
            USD: 0.3478,
            INR: 29.0,
            CHF: 0.31,
            JPY: 52.0,
            EUR: 0.32,
            GBP: 0.27,
        };

        return NextResponse.json({
            success: false,
            data: {
                flowUsdPrice: 0.3478, // Real FLOW price from the logs
                conversionRates: fallbackRates,
                rawPrices: {},
                timestamp: new Date().toISOString(),
                error: 'Using fallback rates due to API error'
            }
        });
    }
}