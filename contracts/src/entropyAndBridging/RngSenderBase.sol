// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract RngSenderBase is IEntropyConsumer, OApp {
    using OptionsBuilder for bytes;

    // Pyth Entropy contract on Base Sepolia
    IEntropyV2 public constant entropy = IEntropyV2(address(0x41c9e3F40ad34c79f1c99b66a45efB830d4C));

    // --- CORRECTED STATE VARIABLES FOR TWO-WAY COMMUNICATION ---
    event RandomNumberRequestReceived(uint64 indexed pythSequenceNumber, uint32 originEid, bytes32 originAddress);
    event RandomNumberSent(uint64 indexed pythSequenceNumber, bytes32 randomNumber, uint32 destinationEid);

    // Stores the origin information to send the random number back.
    struct CallbackInfo {
        uint32 originEid;
        bytes32 originAddress;
    }

    mapping(uint64 => CallbackInfo) public pythCallbacks;
    // --- END OF CORRECTIONS ---

    constructor(address _lzEndpoint, address _owner) OApp(_lzEndpoint, _owner) Ownable(_owner) {}

    /**
     * @notice This function is called by LayerZero when a message is received from another chain (e.g., your LotteryPool).
     * @dev It expects a request to generate a random number.
     * This contract must be funded with Base ETH to pay for Pyth and LayerZero return fees.
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata /*_message*/,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        uint128 pythFee = entropy.getFeeV2();
        require(address(this).balance >= pythFee, "RngSenderBase: Insufficient balance for Pyth fee.");

        // Request a random number from Pyth, paying the fee from this contract's balance.
        uint64 sequenceNumber = entropy.requestV2{value: pythFee}();

        // Store the sender's information to know where to send the random number back.
        pythCallbacks[sequenceNumber] = CallbackInfo({
            originEid: _origin.srcEid,
            originAddress: _origin.sender
        });

        emit RandomNumberRequestReceived(sequenceNumber, _origin.srcEid, _origin.sender);
    }

    /**
     * @notice Pyth's callback function, triggered after the random number is generated.
     */
    function entropyCallback(uint64 sequenceNumber, address, bytes32 randomNumber) internal override {
        CallbackInfo storage callback = pythCallbacks[sequenceNumber];
        require(callback.originEid != 0, "RngSenderBase: Invalid sequence number for callback.");

        bytes memory message = abi.encode(randomNumber);
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0); // Gas for LotteryPool._selectWinner

        // Quote the fee for the RETURN message (Base -> Flow)
        MessagingFee memory fee = _quote(callback.originEid, message, options, false);
        require(address(this).balance >= fee.nativeFee, "RngSenderBase: Insufficient balance for LZ return fee.");
        
        // Send the random number back to the original requester (LotteryPool).
        // The fee is paid from this contract's balance.
        _lzSend(
            callback.originEid,
            message,
            options,
            fee,
            payable(owner()) // Refund address for any LZ overpayment is the contract owner
        );

        emit RandomNumberSent(sequenceNumber, randomNumber, callback.originEid);

        // Clean up state
        delete pythCallbacks[sequenceNumber];
    }

    // Required by IEntropyConsumer
    function getEntropy() internal pure override returns (address) {
        return address(entropy);
    }

    /**
     * @notice Allows the owner to withdraw any excess ETH from the contract.
     * @param _to The address to send the funds to.
     */
    function withdraw(address payable _to) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        (bool success, ) = _to.call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // Allow the contract to be funded with ETH.
    receive() external payable {}
}