// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OApp, Origin} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {MessagingFee, ILayerZeroEndpointV2, SendParam} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {IEntropy} from "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import {Options} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/Options.sol"; // CHANGED: Import Options library

contract RngContractBase is OApp {
    IEntropy public pythEntropy;
    // This is the Pyth Entropy contract on Base Sepolia, update if using a different network.
    address public constant pythEntropyAddress = 0x41c9e39574f40ad34c79f1c99b66a45efb830d4c;

    struct RngRequest {
        uint32 originEid; // CHANGED: Renamed to originEid for clarity
        bytes32 originAddress;
    }
    
    mapping(bytes32 => RngRequest) public pythRequests;

    constructor(
        address _lzEndpoint,
        address _owner
    ) OApp(_lzEndpoint, _owner) {
        pythEntropy = IEntropy(pythEntropyAddress);
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32, /* _guid */
        bytes calldata, /* _message */
        address, /* _executor */
        bytes calldata /* _extraData */
    ) internal override {
        // This contract must be pre-funded to pay the Pyth fee.
        uint256 fee = pythEntropy.getFee();
        require(address(this).balance >= fee, "Not enough balance to pay Pyth fee");
        
        // Request the random number from Pyth Entropy
        bytes32 requestId = pythEntropy.request{value: fee}(bytes32(0));

        // Store the origin details to send the response back later
        pythRequests[requestId] = RngRequest({
            originEid: _origin.eid, // CHANGED: Use _origin.eid
            originAddress: _origin.sender
        });
    }

    function entropyCallback(
        bytes32 _requestId,
        bytes32 _randomNumber,
        bytes calldata /* userData */
    ) external {
        require(msg.sender == address(pythEntropy), "Invalid callback sender");

        RngRequest memory request = pythRequests[_requestId];
        require(request.originAddress != bytes32(0), "Invalid request ID");
        delete pythRequests[_requestId];

        // CHANGED: Use the V2 Options builder
        // This sets aside 200,000 gas for execution on the destination chain (Flow).
        bytes memory options = Options.newOptions().addExecutorLzReceiveOption(200000, 0);

        // 1. Assemble the SendParam struct
        SendParam memory sendParam = SendParam({
            dstEid: request.originEid,
            receiver: request.originAddress,
            message: abi.encode(_randomNumber),
            options: options
        });

        // 2. Use the struct to get a quote
        MessagingFee memory fee = endpoint.quote(sendParam, false); // CHANGED: Second argument must be a boolean
        
        // This contract must also have enough funds to pay for the return message.
        require(address(this).balance >= fee.nativeFee, "Not enough balance to pay LZ fee");

        // 3. Use the struct and fee to send the message
        _lzSend{value: fee.nativeFee}(sendParam, fee, payable(owner())); // CHANGED: Pay fee with `value`

    }

    // withdraw and receive functions remain the same...
    function withdraw(address payable _to) external onlyOwner {
        _to.transfer(address(this).balance);
    }

    receive() external payable {}
}