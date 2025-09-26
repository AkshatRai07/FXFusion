// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { PythStructs } from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

// Interface to interact with your f-Token contracts (fCHF, fEUR, etc.)
interface IForeignToken {
    function buyTokens(uint256 rate) external payable;
    function sellTokens(uint256 tokenAmount, uint256 rate) external;
}

contract App {
    IPyth pyth;

    address public constant PythAddress = 0x2880aB155794e7179c9eE2e38200202908C17B43;
    bytes32 public constant FLOW_USD = 0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30;
    bytes32 public constant USD_CHF = 0x0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8;
    bytes32 public constant USD_INR = 0x0ac0f9a2886fc2dd708bc66cc2cea359052ce89d324f45d95fadbc6c4fcf1809;
    bytes32 public constant USD_YEN = 0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52;
    bytes32 public constant GBP_USD = 0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1;
    bytes32 public constant EUR_USD = 0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b;
    bytes32 public constant USDC_USD = 0xec7a2621453a2ef63a771f280145c3866de464b126380614532a8a183533d0a9;

    address public immutable fCHF_Address;
    address public immutable fEUR_Address;
    address public immutable fGBP_Address;
    address public immutable fINR_Address;
    address public immutable fUSD_Address;
    address public immutable fYEN_Address;

    mapping(string => bytes32) public nameToId;
    mapping(string => address) public nameToAddress;

    mapping(bytes32 => address) public swapContracts;

    event TokensBoughtWithFlow(address indexed user, address indexed token, uint256 flowAmount, uint256 tokenAmount);
    event TokensSoldForFlow(address indexed user, address indexed token, uint256 tokenAmount, uint256 flowAmount);
    event LiquidityAdded(address indexed user, address indexed swapContract, uint256 lpTokensMinted);
    event LiquidityRemoved(address indexed user, address indexed swapContract, uint256 amountAReturned, uint256 amountBReturned);

    uint256 public constant DECIMALS = 18;

    constructor(
        address _fCHF_Address,
        address _fEUR_Address,
        address _fGBP_Address,
        address _fINR_Address,
        address _fUSD_Address,
        address _fYEN_Address
    ) {
        pyth = IPyth(PythAddress);

        fCHF_Address = _fCHF_Address;
        fEUR_Address = _fEUR_Address;
        fGBP_Address = _fGBP_Address;
        fINR_Address = _fINR_Address;
        fUSD_Address = _fUSD_Address;
        fYEN_Address = _fYEN_Address;

        nameToAddress["fCHF"] = _fCHF_Address;
        nameToAddress["fEUR"] = _fEUR_Address;
        nameToAddress["fGBP"] = _fGBP_Address;
        nameToAddress["fINR"] = _fINR_Address;
        nameToAddress["fUSD"] = _fUSD_Address;
        nameToAddress["fYEN"] = _fYEN_Address;

        nameToId["fCHF"] = USD_CHF;
        nameToId["fEUR"] = EUR_USD;
        nameToId["fGBP"] = GBP_USD;
        nameToId["fINR"] = USD_INR;
        nameToId["fUSD"] = USDC_USD;
        nameToId["fYEN"] = USD_YEN;

        swapContracts[tokenA < tokenB ? keccak256(abi.encodePacked(tokenA, tokenB)) : keccak256(abi.encodePacked(tokenB, tokenA))] = address(0);
    }

    function updatePrice(bytes[] calldata updateData) public payable {
        uint256 fee = pyth.getUpdateFee(updateData);
        require(msg.value >= fee, "Insufficient fee provided for Pyth update");
    
        pyth.updatePriceFeeds{value: fee}(updateData);

        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }

    function getNormalizedPrice(bytes32 priceId) public view returns (uint256) {
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(priceId);
        require(pythPrice.price > 0, "Pyth price is invalid");

        uint256 price = uint256(int256(pythPrice.price));
        uint256 expo = uint256(int256(-pythPrice.expo)); // Make the exponent positive

        // Check if it's an XYZ/USD pair that needs to be inverted.
        if (priceId == FLOW_USD || priceId == GBP_USD || priceId == EUR_USD || priceId == USDC_USD) {
            return (10**expo * 10**DECIMALS) / price;
        } 
        
        // Handle USD/XYZ pairs.
        else if (priceId == USD_CHF || priceId == USD_INR || priceId == USD_YEN) {
            return (price * 10**DECIMALS) / 10**expo;
        } 
        
        else {
            revert("Price feed not supported");
        }
    }

    function buyTokensFromFlow(string memory _tokenName, bytes[] calldata updateData) public payable {
        string memory tokenName = _tokenName;

        uint256 fee = pyth.getUpdateFee(updateData);
        require(msg.value > fee, "Insufficient ETH: Must cover Pyth fee and token cost");
    
        pyth.updatePriceFeeds{value: fee}(updateData);
        
        uint256 ethForPurchase = msg.value - fee;

        bytes32 tokenId = nameToId[tokenName];
        require(tokenId != bytes32(0), "Token not supported");
        address tokenAddress = nameToAddress[tokenName];

        uint256 flowPriceInUsd = getNormalizedPrice(FLOW_USD);
        uint256 tokenPriceInUsd = getNormalizedPrice(tokenId);
        
        uint256 flowPerTokenRate = (flowPriceInUsd * 10**DECIMALS) / tokenPriceInUsd;

        IForeignToken(tokenAddress).buyTokens{value: ethForPurchase}(flowPerTokenRate);
        emit TokensBoughtWithFlow(msg.sender, tokenAddress, ethForPurchase, tokenAmountReceived);
    }

    function sellTokensForFlow(string memory _tokenName, uint256 tokenAmount, bytes[] calldata updateData) external payable {
        string memory tokenName = _tokenName;

        uint256 fee = pyth.getUpdateFee(updateData);
        require(msg.value >= fee, "Insufficient fee for Pyth update");
        pyth.updatePriceFeeds{value: fee}(updateData);

        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }

        bytes32 tokenId = nameToId[tokenName];
        require(tokenId != bytes32(0), "Token not supported");
        address tokenAddress = nameToAddress[tokenName];

        uint256 flowPriceInUsd = getNormalizedPrice(FLOW_USD);
        uint256 tokenPriceInUsd = getNormalizedPrice(tokenId);
        uint256 flowPerTokenRate = (flowPriceInUsd * 10**DECIMALS) / tokenPriceInUsd;
        uint256 ethAmountToReceive = (tokenAmount * 10**DECIMALS) / flowPerTokenRate;

        IERC20(tokenAddress).transferFrom(msg.sender, address(this), tokenAmount);
        IForeignToken(tokenAddress).sellTokens(tokenAmount, flowPerTokenRate);

        payable(msg.sender).call{value : ethAmountToReceive}("");
        emit TokensSoldForFlow(msg.sender, tokenAddress, tokenAmount, ethAmountToReceive);
    }

    function addLiquidity(string calldata _tokenNameA, string calldata _tokenNameB, uint256 amountA, uint256 amountB) external {
        address tokenAddressA = nameToAddress[_tokenNameA];
        address tokenAddressB = nameToAddress[_tokenNameB];
        address swapContractAddress = swapContracts[getPairKey(tokenAddressA, tokenAddressB)];
        require(swapContractAddress != address(0), "Swap contract for this pair not found");

        IERC20(tokenAddressA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenAddressB).transferFrom(msg.sender, address(this), amountB);
        
        IERC20(tokenAddressA).approve(swapContractAddress, amountA);
        IERC20(tokenAddressB).approve(swapContractAddress, amountB);
        
        uint256 lpBalanceBefore = IERC20(swapContractAddress).balanceOf(address(this));
        IFiatSwap(swapContractAddress).addLiquidity(amountA, amountB);
        uint256 lpBalanceAfter = IERC20(swapContractAddress).balanceOf(address(this));
        uint256 mintedLp = lpBalanceAfter - lpBalanceBefore;

        require(mintedLp > 0, "No liquidity tokens minted");
        IERC20(swapContractAddress).transfer(msg.sender, mintedLp);

        emit LiquidityAdded(msg.sender, swapContractAddress, mintedLp);
    }

    function removeLiquidity(string calldata _tokenNameA, string calldata _tokenNameB, uint256 lpTokenAmount) external {
        address tokenAddressA = nameToAddress[_tokenNameA];
        address tokenAddressB = nameToAddress[_tokenNameB];
        address swapContractAddress = swapContracts[getPairKey(tokenAddressA, tokenAddressB)];
        require(swapContractAddress != address(0), "Swap contract for this pair not found");

        IERC20(swapContractAddress).transferFrom(msg.sender, address(this), lpTokenAmount);

        uint256 balanceABefore = IERC20(tokenAddressA).balanceOf(address(this));
        uint256 balanceBBefore = IERC20(tokenAddressB).balanceOf(address(this));
        
        IFiatSwap(swapContractAddress).removeLiquidity(lpTokenAmount);
        
        uint256 balanceAAfter = IERC20(tokenAddressA).balanceOf(address(this));
        uint256 balanceBAfter = IERC20(tokenAddressB).balanceOf(address(this));
        
        uint256 receivedA = balanceAAfter - balanceABefore;
        uint256 receivedB = balanceBAfter - balanceBBefore;

        IERC20(tokenAddressA).transfer(msg.sender, receivedA);
        IERC20(tokenAddressB).transfer(msg.sender, receivedB);

        emit LiquidityRemoved(msg.sender, swapContractAddress, receivedA, receivedB);
    }
}