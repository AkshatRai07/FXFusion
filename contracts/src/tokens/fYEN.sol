// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract fYEN is ERC20, Ownable {
    address public appContract;
    uint256 public constant SCALE = 1e18;

    constructor() ERC20("flowYEN", "fYEN") Ownable(msg.sender) {
        _mint(address(this), 10 * 10 ** 18 * 10 ** decimals()); // 10 quintillion fYEN
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner() || msg.sender == appContract, "Not authorized");
        _;
    }

    function setAppContract(address _appContract) external onlyOwner {
        require(_appContract != address(0), "Invalid App contract");
        appContract = _appContract;
    }

    function buyTokens(uint256 rate) external payable onlyAuthorized {
        require(msg.value > 0, "Send ETH to buy fYEN");

        uint256 tokenAmount = (msg.value * rate) / SCALE;
        require(balanceOf(address(this)) >= tokenAmount, "Not enough fYEN in contract");

        _transfer(address(this), msg.sender, tokenAmount);
    }

    function sellTokens(uint256 tokenAmount, uint256 rate) external onlyAuthorized {
        require(tokenAmount > 0, "Must sell > 0 tokens");

        uint256 ethAmount = (tokenAmount * SCALE) / rate;
        require(address(this).balance >= ethAmount, "Not enough ETH liquidity");

        _transfer(msg.sender, address(this), tokenAmount);
        payable(msg.sender).transfer(ethAmount);
    }

    function transferToApp(address appAddress, uint256 amount) external onlyAuthorized() {
        require(appAddress != address(0), "Invalid app address");
        require(balanceOf(address(this)) >= amount, "Insufficient balance");
        _transfer(address(this), appAddress, amount);
    }

    receive() external payable {}
}