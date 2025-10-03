// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FiatSwap is Ownable {
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;
    address public creatorAddress;

    uint256 public constant FEE_NUM = 3;    // 0.3% fee numerator
    uint256 public constant FEE_DEN = 1000; // denominator
    uint256 public constant SCALE = 1e18;

    modifier onlyAuthorized() {
        require(msg.sender == owner() || msg.sender == creatorAddress, "Not authorized");
        _;
    }

    constructor(address _tokenA, address _tokenB) Ownable(msg.sender) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function setCreatorAddress(address _creatorAddress) external onlyOwner {
        require(_creatorAddress != address(0), "Invalid creator address");
        creatorAddress = _creatorAddress;
    }

    function swapAtoB(uint256 amountA, uint256 rateAtoB) external onlyAuthorized {
        require(amountA > 0, "Invalid amount");

        uint256 fee = (amountA * FEE_NUM) / FEE_DEN;
        uint256 amountAfterFee = amountA - fee;
        uint256 amountB = (amountAfterFee * rateAtoB) / SCALE;

        require(tokenB.balanceOf(address(this)) >= amountB, "Not enough liquidity in B");
        require(tokenA.transferFrom(msg.sender, address(this), amountA), "TokenA transfer failed");
        require(tokenB.transfer(msg.sender, amountB), "TokenB transfer failed");
    }

    function swapBtoA(uint256 amountB, uint256 rateBtoA) external onlyAuthorized {
        require(amountB > 0, "Invalid amount");

        uint256 fee = (amountB * FEE_NUM) / FEE_DEN;
        uint256 amountAfterFee = amountB - fee;
        uint256 amountA = (amountAfterFee * rateBtoA) / SCALE;

        require(tokenA.balanceOf(address(this)) >= amountA, "Not enough liquidity in A");
        require(tokenB.transferFrom(msg.sender, address(this), amountB), "TokenB transfer failed");
        require(tokenA.transfer(msg.sender, amountA), "TokenA transfer failed");
    }
}