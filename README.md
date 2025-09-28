# 🌐 FXFusion

**FXFusion** is a decentralized forex trading platform built on the **Flow Testnet**, enabling users to trade forex pairs through tokenized assets — without worrying about local forex regulations.  
In India, forex trading is heavily restricted (e.g., **INR/USD is allowed**, but **EUR/USD is banned**). FXFusion bypasses this limitation by offering **synthetic forex tokens**, letting users trade forex-like assets directly on-chain.

## 🚀 Features

- 📊 **Synthetic Forex Tokens** – Trade tokenized versions of major forex currencies.
- ⚡ **On-Chain Swaps** – Swap tokens instantly using smart contracts.
- 📡 **Pyth Network Oracle** – Get real-time and reliable forex price feeds.
- 🔐 **Regulation-Free Trading** – Trade pairs like EUR/USD, GBP/USD, etc., without falling under India’s forex restrictions.
- 🛠️ **Deployed on Flow Testnet** – Low-cost and fast transactions for testing.

## 📜 Deployed Contracts (Flow Testnet)

| Token          | Address                                                                 |
|----------------|-------------------------------------------------------------------------|
| fCHF (Swiss Franc) | `0x9bda12d3f4afff285eed11b19e84e7a2cdfb4561` |
| fEUR (Euro)        | `0xa3d83ca946697fb88db35dd5dac6e6ace4746951` |
| fGBP (British Pound) | `0x024808dbbd74bce60e31a4e8a6e3f9c48df5d3cf` |
| fINR (Indian Rupee)  | `0xbfad3c0108f78c128a7ea46d5d1975f2b3f08c36` |
| fUSD (US Dollar)     | `0xac9d9565188ca22ffdf3c9aeee3cf70b333308c5` |
| fYEN (Japanese Yen)  | `0x02846c95ff01ffadcdfbcd9fe104959f51602600` |
| BasketJsonNFT        | `0xfcafefa85d7e6f2b0c36a25675316ac41c3881ae` |
| App Contract         | `0xeb29dcf2776474043cda46627ce22978a0b09ad1` |

> 🔁 There are also **15 swap contracts** deployed for cross-token swaps (not listed here for brevity).

## ⚡ How It Works

1. **Forex Tokenization**  
   - Each supported fiat currency has a synthetic token (fUSD, fEUR, fINR, etc.).
   - These tokens track real forex prices via **Pyth Network**.

2. **Swapping Mechanism**  
   - Swap tokens directly on-chain.  
   - Example: Trade `fEUR → fUSD` at real forex rates.

3. **NFT Basket**  
   - Users can mint **BasketJsonNFTs**, representing a basket of forex tokens.

4. **Frontend**  
   - A dApp UI where traders can:
     - Select forex pairs.
     - Swap between them at Pyth-provided prices.
     - Track portfolio baskets.

## 🛠️ Tech Stack

- **Smart Contracts** – Solidity + Flow EVM
- **Oracle** – [Pyth Network](https://pyth.network)
- **Frontend** – Next.js + TailwindCSS
- **Blockchain** – Flow Testnet

## 🌍 Why FXFusion?

- Breaks down **forex restrictions** in countries like India.
- Provides **transparent, decentralized, and censorship-resistant forex trading**.
- Uses **real-time oracles** to ensure accurate pricing.
- Built on **Flow Testnet** for experimentation and scaling.