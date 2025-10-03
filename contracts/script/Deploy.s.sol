// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/app/App.sol";
import "../src/nfts/BasketJsonNFT.sol";
import "../src/tokens/fCHF.sol";
import "../src/tokens/fEUR.sol";
import "../src/tokens/fGBP.sol";
import "../src/tokens/fINR.sol";
import "../src/tokens/fUSD.sol";
import "../src/tokens/fYEN.sol";

contract DeployYourContract is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy all token contracts with delays
        console.log("Deploying fCHF Token...");
        fCHF chfToken = new fCHF();
        console.log("fCHF deployed at:", address(chfToken));
        vm.sleep(10000); // 10 seconds delay

        console.log("Deploying fEUR Token...");
        fEUR eurToken = new fEUR();
        console.log("fEUR deployed at:", address(eurToken));
        vm.sleep(10000); // 10 seconds delay

        console.log("Deploying fGBP Token...");
        fGBP gbpToken = new fGBP();
        console.log("fGBP deployed at:", address(gbpToken));
        vm.sleep(10000); // 10 seconds delay

        console.log("Deploying fINR Token...");
        fINR inrToken = new fINR();
        console.log("fINR deployed at:", address(inrToken));
        vm.sleep(10000); // 10 seconds delay

        console.log("Deploying fUSD Token...");
        fUSD usdToken = new fUSD();
        console.log("fUSD deployed at:", address(usdToken));
        vm.sleep(10000); // 10 seconds delay

        console.log("Deploying fYEN Token...");
        fYEN yenToken = new fYEN();
        console.log("fYEN deployed at:", address(yenToken));
        vm.sleep(10000); // 10 seconds delay

        // Deploy NFT contract
        console.log("Deploying BasketJsonNFT...");
        BasketJsonNFT basketNFT = new BasketJsonNFT();
        console.log("BasketJsonNFT deployed at:", address(basketNFT));
        vm.sleep(10000); // 10 seconds delay

        // Deploy main app contract with all addresses
        console.log("Deploying App contract...");
        App app = new App(
            address(chfToken),
            address(eurToken),
            address(gbpToken),
            address(inrToken),
            address(usdToken),
            address(yenToken),
            address(basketNFT)
        );
        console.log("App deployed at:", address(app));
        vm.sleep(10000); // 10 seconds delay

        // Set App contract as authorized in all token contracts
        console.log("Setting App contract authorization...");
        chfToken.setAppContract(address(app));
        eurToken.setAppContract(address(app));
        gbpToken.setAppContract(address(app));
        inrToken.setAppContract(address(app));
        usdToken.setAppContract(address(app));
        yenToken.setAppContract(address(app));

        console.log("\n=== FiatSwap Contract Addresses ===");
        address[6] memory tokens = [
            address(chfToken),
            address(eurToken),
            address(gbpToken),
            address(inrToken),
            address(usdToken),
            address(yenToken)
        ];

        string[6] memory tokenNames = ["fCHF", "fEUR", "fGBP", "fINR", "fUSD", "fYEN"];

        for (uint256 i = 0; i < tokens.length; i++) {
            for (uint256 j = i + 1; j < tokens.length; j++) {
                // Create pair key (same logic as App.sol)
                bytes32 pairKey = tokens[i] < tokens[j] 
                    ? keccak256(abi.encodePacked(tokens[i], tokens[j]))
                    : keccak256(abi.encodePacked(tokens[j], tokens[i]));
                
                // Get the FiatSwap contract address
                address swapAddress = app.swapContracts(pairKey);
                
                // Log with readable pair names
                console.log("FiatSwap %s-%s:", tokenNames[i], tokenNames[j], swapAddress);
            }
        }

        vm.stopBroadcast();

        // Log all deployed contract addresses
        console.log("\n=== Final Deployed Contract Addresses ===");
        console.log("fCHF Token:", address(chfToken));
        console.log("fEUR Token:", address(eurToken));
        console.log("fGBP Token:", address(gbpToken));
        console.log("fINR Token:", address(inrToken));
        console.log("fUSD Token:", address(usdToken));
        console.log("fYEN Token:", address(yenToken));
        console.log("BasketJsonNFT:", address(basketNFT));
        console.log("App:", address(app));
    }
}
