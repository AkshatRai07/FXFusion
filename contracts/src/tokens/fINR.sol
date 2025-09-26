// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract fINR is ERC20 {
    uint256 public constant SCALE = 1e18;

    constructor() ERC20("flowINR", "fINR") {
        _mint(address(this), 1_000_000 * 10 ** decimals());
    }

    function buyTokens(uint256 rate) external payable {
        require(msg.value > 0, "Send ETH to buy fINR");

        uint256 tokenAmount = (msg.value * rate) / SCALE;
        require(balanceOf(address(this)) >= tokenAmount, "Not enough fINR in contract");

        _transfer(address(this), msg.sender, tokenAmount);
    }

    function sellTokens(uint256 tokenAmount, uint256 rate) external {
        require(tokenAmount > 0, "Must sell > 0 tokens");

        uint256 ethAmount = (tokenAmount * SCALE) / rate;
        require(address(this).balance >= ethAmount, "Not enough ETH liquidity");

        _transfer(msg.sender, address(this), tokenAmount);

        (bool success, ) = payable(msg.sender).call{ value:ethAmount }("");

        require(success, "Transaction unsuccessfull");
    }
}