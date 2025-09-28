// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// --- INTERFACES FOR EXTERNAL CONTRACTS ---

// Interface for your main App contract
interface IApp {
    function swapContracts(bytes32 pairKey) external view returns (address);
}

// Interface for the fiat token contracts (fUSD, fEUR, etc.)
interface IFiatToken is IERC20 {
    function buyTokens(uint256 rate) external payable;
}

// Interface for the FiatSwap contracts deployed by App.sol
interface IFiatSwap is IERC20 {
    function addLiquidity(uint256 amountA, uint256 amountB) external;
}

/// @title ProvideLiquidity
/// @notice A Foundry script to interact with an already-deployed App contract.
/// This script funds the caller's wallet with all six fiat tokens and then
/// provides liquidity to all 15 FiatSwap pools.
contract ProvideLiquidity is Script {
    // ---! CONFIGURATION !---
    // PASTE YOUR DEPLOYED APP CONTRACT ADDRESS HERE
    address constant appAddress = 0xEb29dCF2776474043cdA46627cE22978a0B09ad1; // <-- CHANGE THIS

    // Deployed ERC20 token contracts
    address constant fCHF = 0x9BdA12d3f4aFfF285Eed11B19e84E7A2Cdfb4561;
    address constant fEUR = 0xa3d83ca946697Fb88DB35dD5dAc6E6Ace4746951;
    address constant fGBP = 0x024808dBBD74BCe60e31a4e8A6e3f9c48DF5D3Cf;
    address constant fINR = 0xbfaD3c0108f78c128A7ea46D5d1975f2B3f08C36;
    address constant fUSD = 0xaC9D9565188CA22fFDF3c9aEEe3Cf70B333308C5;
    address constant fYEN = 0x02846C95FF01ffAdcdfBcD9FE104959F51602600;
    // --- END CONFIGURATION ---

    IApp app = IApp(appAddress);
    address[6] tokens;

    function run() external {
        require(
            appAddress != address(0),
            "Please update the 'appAddress' in the script before running."
        );

        tokens = [fCHF, fEUR, fGBP, fINR, fUSD, fYEN];

        vm.startBroadcast();

        // console.log("--- 1. Buying Tokens ---");
        buyAllTokens();

        // console.log("\n--- 2. Adding Liquidity to All Pairs ---");
        // addAllLiquidity();

        vm.stopBroadcast();

        console.log(" All liquidity provided successfully! ");
    }

    /// @notice Buys 1,000,000 of each of the 6 fiat tokens.
    function buyAllTokens() internal {
        uint256 buyRate = 100_000; // 100,000 tokens per 1 ETH
        uint256 ethToSend = 1 ether;

        for (uint i = 0; i < 1; i++) {
            address tokenAddr = tokens[i];
            IFiatToken token = IFiatToken(tokenAddr);
            console.log("Buying 100,000 tokens from contract:", tokenAddr);
            token.buyTokens{value: ethToSend}(buyRate);
            uint256 balance = token.balanceOf(msg.sender);
            console.log("  -> New balance:", balance / 1e18, "tokens");
        }
    }

    /// @notice Iterates through all 15 unique pairs and adds liquidity.
    function addAllLiquidity() internal {
        uint256 liquidityAmount = 99_000 * 1e18; // 100,000 tokens

        for (uint i = 0; i < 1; i++) {
            for (uint j = i + 5; j < 6; j++) {
                address tokenA_Address = tokens[i];
                address tokenB_Address = tokens[j];

                console.log(
                    "\nProcessing pair:",
                    tokenA_Address,
                    " / ",
                    tokenB_Address
                );

                // Get swap contract address from the App's mapping
                bytes32 pairKey = getPairKey(tokenA_Address, tokenB_Address);
                address swapContractAddress = app.swapContracts(pairKey);
                console.log(
                    "  -> Retrieved FiatSwap address:",
                    swapContractAddress
                );

                IFiatSwap fiatSwap = IFiatSwap(swapContractAddress);
                IFiatToken tokenA = IFiatToken(tokenA_Address);
                IFiatToken tokenB = IFiatToken(tokenB_Address);

                // Approve and add liquidity
                console.log("  -> Approving tokens for swap contract...");
                tokenA.approve(swapContractAddress, liquidityAmount);
                tokenB.approve(swapContractAddress, liquidityAmount);

                console.log("  -> Adding liquidity...");
                fiatSwap.addLiquidity(liquidityAmount, liquidityAmount);

                uint256 lpBalance = fiatSwap.balanceOf(msg.sender);
                console.log(
                    "  -> SUCCESS! LP token balance:",
                    lpBalance / 1e18
                );
            }
        }
    }

    /// @notice Replicates the internal getPairKey logic from App.sol
    function getPairKey(
        address tokenA,
        address tokenB
    ) internal pure returns (bytes32) {
        return
            tokenA < tokenB
                ? keccak256(abi.encodePacked(tokenA, tokenB))
                : keccak256(abi.encodePacked(tokenB, tokenA));
    }
}
