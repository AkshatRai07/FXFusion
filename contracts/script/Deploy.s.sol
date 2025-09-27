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

        // Deploy all token contracts
        fCHF chfToken = new fCHF();
        fEUR eurToken = new fEUR();
        fGBP gbpToken = new fGBP();
        fINR inrToken = new fINR();
        fUSD usdToken = new fUSD();
        fYEN yenToken = new fYEN();

        // Deploy NFT contract
        BasketJsonNFT basketNFT = new BasketJsonNFT();

        // Deploy main app contract with all addresses
        App app = new App(
            address(chfToken),
            address(eurToken),
            address(gbpToken),
            address(inrToken),
            address(usdToken),
            address(yenToken),
            address(basketNFT)
        );

        vm.stopBroadcast();

        // Log all deployed contract addresses
        console.log("=== Deployed Contract Addresses ===");
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
