// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FiatSwap is ERC20 {
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    uint256 public constant FEE_NUM = 3;    // 0.3% fee numerator
    uint256 public constant FEE_DEN = 1000; // denominator
    uint256 public constant SCALE = 1e18;

    constructor(address _tokenA, address _tokenB)
        ERC20("FiatSwap LP", "FSLP")
    {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external {
        require(amountA > 0 && amountB > 0, "Must provide both tokens");

        require(tokenA.transferFrom(msg.sender, address(this), amountA), "TokenA transfer failed");
        require(tokenB.transferFrom(msg.sender, address(this), amountB), "TokenB transfer failed");

        uint256 lpTokensToMint;
        if (totalSupply() == 0) {
            lpTokensToMint = amountA;
        } else {
            uint256 reserveA = tokenA.balanceOf(address(this)) - amountA;
            lpTokensToMint = (amountA * totalSupply()) / reserveA;
        }

        require(lpTokensToMint > 0, "Insufficient liquidity minted");
        _mint(msg.sender, lpTokensToMint);
    }

    function removeLiquidity(uint256 lpTokenAmount) external {
        require(lpTokenAmount > 0, "Must remove > 0 LP tokens");
        require(balanceOf(msg.sender) >= lpTokenAmount, "Insufficient LP balance");

        uint256 totalReserveA = tokenA.balanceOf(address(this));
        uint256 totalReserveB = tokenB.balanceOf(address(this));
        uint256 totalLPSupply = totalSupply();

        uint256 amountAToReturn = (lpTokenAmount * totalReserveA) / totalLPSupply;
        uint256 amountBToReturn = (lpTokenAmount * totalReserveB) / totalLPSupply;

        _burn(msg.sender, lpTokenAmount);

        require(tokenA.transfer(msg.sender, amountAToReturn), "TokenA transfer failed");
        require(tokenB.transfer(msg.sender, amountBToReturn), "TokenB transfer failed");
    }

    function swapAtoB(uint256 amountA, uint256 rateAtoB) external {
        require(amountA > 0, "Invalid amount");

        uint256 fee = (amountA * FEE_NUM) / FEE_DEN;
        uint256 amountAfterFee = amountA - fee;
        uint256 amountB = (amountAfterFee * rateAtoB) / SCALE;

        require(tokenB.balanceOf(address(this)) >= amountB, "Not enough liquidity in B");
        require(tokenA.transferFrom(msg.sender, address(this), amountA), "TokenA transfer failed");
        require(tokenB.transfer(msg.sender, amountB), "TokenB transfer failed");
    }

    function swapBtoA(uint256 amountB, uint256 rateBtoA) external {
        require(amountB > 0, "Invalid amount");

        uint256 fee = (amountB * FEE_NUM) / FEE_DEN;
        uint256 amountAfterFee = amountB - fee;
        uint256 amountA = (amountAfterFee * rateBtoA) / SCALE;

        require(tokenA.balanceOf(address(this)) >= amountA, "Not enough liquidity in A");
        require(tokenB.transferFrom(msg.sender, address(this), amountB), "TokenB transfer failed");
        require(tokenA.transfer(msg.sender, amountA), "TokenA transfer failed");
    }
}