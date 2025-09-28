// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract fCHF is ERC20 {
    constructor() ERC20("flowCHF", "fCHF") {
        _mint(address(this), 1_000_000 * 10 ** decimals());
    }

    function buyTokens(uint256 rate) external payable {
        require(msg.value > 0, "Send ETH to buy fCHF");

        uint256 tokenAmount = msg.value * rate;
        require(balanceOf(address(this)) >= tokenAmount, "Not enough fCHF in contract");

        _transfer(address(this), msg.sender, tokenAmount);
    }

    function sellTokens(uint256 tokenAmount, uint256 rate) external {
        require(tokenAmount > 0, "Must sell > 0 tokens");

        uint256 ethAmount = tokenAmount / rate;
        require(address(this).balance >= ethAmount, "Not enough ETH liquidity");

        _transfer(msg.sender, address(this), tokenAmount);

        payable(msg.sender).transfer(ethAmount);
    }
}