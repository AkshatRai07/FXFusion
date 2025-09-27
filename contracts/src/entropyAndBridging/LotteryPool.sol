// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OApp, Origin} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {MessagingFee, ILayerZeroEndpointV2, SendParam} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Options} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/Options.sol"; // CHANGED: Import Options library

interface IApp {
    function sellTokensForFlow(
        string memory _tokenName,
        uint256 tokenAmount,
        bytes[] calldata updateData
    ) external payable;
    function addressToName(address) external view returns (string memory);
}

contract LotteryPool is OApp {
    // State variables, events, and modifiers remain the same...
    IERC20 public immutable flowToken;
    address public keeper;
    IApp public appContract;
    uint32 public immutable baseChainId; // This is the LayerZero Endpoint ID (eid)
    bytes32 public immutable rngContractAddress;
    address[] public participants;
    mapping(address => uint256) public participantStakes;
    uint256 public totalPoolSize;
    uint256 public lastDrawTimestamp;
    uint256 public constant DRAW_INTERVAL = 7 days;
    address public lastWinner;

    event WinnerSelected(address indexed winner, uint256 amountWon);
    event DrawRequested();
    event StakeReceived(address indexed user, uint256 amount);

    modifier onlyAppContract() {
        require(msg.sender == address(appContract), "Only App contract can call");
        _;
    }

    modifier onlyKeeper() {
        require(msg.sender == keeper, "Only keeper can call");
        _;
    }

    // Constructor remains the same...
    constructor(
        address _lzEndpoint,
        address _owner,
        address _flowToken,
        address _appContract,
        uint32 _baseChainId,
        bytes32 _rngContractAddress
    ) OApp(_lzEndpoint, _owner) {
        flowToken = IERC20(_flowToken);
        appContract = IApp(_appContract);
        keeper = _owner;
        baseChainId = _baseChainId;
        rngContractAddress = _rngContractAddress;
        lastDrawTimestamp = block.timestamp;
    }

    // setKeeper and enterLottery functions remain the same...
    function setKeeper(address _newKeeper) external onlyOwner {
        keeper = _newKeeper;
    }

    function enterLottery(address _user, uint256 _amount, address _tokenAddress, bytes[] calldata _updateData) external onlyAppContract payable {
        require(_amount > 0, "Amount must be positive");
        IERC20(_tokenAddress).transferFrom(address(appContract), address(this), _amount);
        IERC20(_tokenAddress).approve(address(appContract), _amount);
        uint256 flowBalanceBefore = address(this).balance;
        string memory tokenName = appContract.addressToName(_tokenAddress);
        appContract.sellTokensForFlow{value: msg.value}(tokenName, _amount, _updateData);
        uint256 flowBalanceAfter = address(this).balance;
        uint256 flowReceived = flowBalanceAfter - flowBalanceBefore;
        require(flowReceived > 0, "Swap to FLOW failed");
        if (participantStakes[_user] == 0) {
            participants.push(_user);
        }
        participantStakes[_user] += flowReceived;
        totalPoolSize += flowReceived;
        emit StakeReceived(_user, flowReceived);
    }

    function requestRandomWinner() external onlyKeeper payable { // CHANGED: Added payable
        require(block.timestamp >= lastDrawTimestamp + DRAW_INTERVAL, "Draw interval not passed");
        require(participants.length > 0, "No participants in the pool");

        // CHANGED: Use the V2 Options builder
        // This sets aside 200,000 gas for execution on the destination chain (Base).
        // Adjust the gas value as needed for your use case.
        bytes memory options = Options.newOptions().addExecutorLzReceiveOption(200000, 0);

        // 1. Assemble the SendParam struct
        SendParam memory sendParam = SendParam({
            dstEid: baseChainId,
            receiver: rngContractAddress,
            message: abi.encode(""), // No payload needed for the request
            options: options
        });

        // 2. Use the struct to get a quote
        MessagingFee memory fee = endpoint.quote(sendParam, false); // CHANGED: Second argument must be a boolean

        // 3. Use the struct and the fee to send the message
        // The keeper must pay the messaging fee via msg.value
        _lzSend(sendParam, fee, payable(msg.sender)); // CHANGED: Removed {value: ...} as it's handled by the OApp

        emit DrawRequested();
    }

    // _lzReceive now correctly checks against the eid and sender address
    function _lzReceive(
        Origin calldata _origin,
        bytes32, /* _guid */
        bytes calldata _message,
        address, /* _executor */
        bytes calldata /* _extraData */
    ) internal override {
        // CHANGED: Use `_origin.eid` and compare against your stored `baseChainId`
        require(_origin.eid == baseChainId && _origin.sender == rngContractAddress, "Unauthorized sender");
        
        (bytes32 randomNumber) = abi.decode(_message, (bytes32));
        _selectWinner(uint256(randomNumber));
    }

    function _selectWinner(uint256 _randomNumber) internal {
        uint256 winnerIndex = _randomNumber % participants.length;
        address winner = participants[winnerIndex];
        lastWinner = winner;
        uint256 amountWon = totalPoolSize;
        totalPoolSize = 0;
        lastDrawTimestamp = block.timestamp;

        for (uint i = 0; i < participants.length; i++) {
            delete participantStakes[participants[i]];
        }
        delete participants;

        (bool success, ) = payable(winner).call{value: amountWon}("");
        require(success, "Transfer failed");

        emit WinnerSelected(winner, amountWon);
    }
    
    // withdraw and receive functions remain the same...
    function withdraw(address payable _to) external onlyOwner {
        _to.transfer(address(this).balance);
    }

    receive() external payable {}
}