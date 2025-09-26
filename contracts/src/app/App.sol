// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
 
import { console2 } from "forge-std/Test.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
 
contract App {
    IPyth pyth;

    address public constant PythAddress = 0x2880aB155794e7179c9eE2e38200202908C17B43;
    bytes32 public constant FLOW_USD = 0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30;

    bytes32 public constant USD_CHF = 0x0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8;
    bytes32 public constant USD_INR = 0x0ac0f9a2886fc2dd708bc66cc2cea359052ce89d324f45d95fadbc6c4fcf1809;
    bytes32 public constant USD_YEN = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;

    bytes32 public constant GBP_USD = 0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1;
    bytes32 public constant EUR_USD = 0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b;

    uint256 public constant DECIMALS = 18;

    constructor() {
        pyth = IPyth(PythAddress);
    }

    function getNormalizedPrice(bytes32 priceId) public view returns (uint256) {
        // Fetch the latest price from Pyth. It's unsafe for production without additional checks.
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);

        // All Pyth prices are integers, so their value is price * 10^expo.
        // The expo is a negative number.
        uint256 price = uint256(int256(pythPrice.price));
        uint256 expo = uint256(int256(-pythPrice.expo)); // Make the exponent positive for easier math

        // Check if it's an XYZ/USD pair that needs to be inverted.
        if (priceId == FLOW_USD || priceId == GBP_USD || priceId == EUR_USD) {
            // Formula for inversion: (1 / (price / 10^expo)) * 10^DECIMALS
            // This simplifies to: (10^expo * 10^DECIMALS) / price
            return (10**expo * 10**DECIMALS) / price;
        } 
        
        // Handle USD/XYZ pairs.
        else if (priceId == USD_CHF || priceId == USD_INR || priceId == USD_YEN) {
            // Formula for direct scaling: (price / 10^expo) * 10^DECIMALS
            // This simplifies to: (price * 10^DECIMALS) / 10^expo
            return (price * 10**DECIMALS) / 10**expo;
        } 
        
        else {
            revert("Price feed not supported");
        }
    }
}
