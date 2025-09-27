// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// CORRECTED IMPORTS
import { OApp, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

interface IApp {
    function sellTokensForFlow(
        string memory _tokenName,
        uint256 tokenAmount,
        bytes[] calldata updateData
    ) external payable;
    function addressToName(address) external view returns (string memory);
}

contract LotteryPool is OApp {
    using OptionsBuilder for bytes;

    IERC20 public immutable flowToken;
    address public keeper;
    IApp public appContract;
    uint32 public immutable baseChainEid; // Renamed for clarity
    bytes32 public immutable rngContractAddress;
    address[] public participants;
    mapping(address => uint256) public participantStakes;
    uint256 public totalPoolSize;
    uint256 public lastDrawTimestamp;
    uint256 public constant DRAW_INTERVAL = 7 days;
    address public lastWinner;

    event WinnerSelected(address indexed winner, uint256 amountWon);
    event DrawRequested(uint32 destinationEid, bytes32 receiver);
    event StakeReceived(address indexed user, uint256 amount);

    modifier onlyAppContract() {
        require(msg.sender == address(appContract), "Only App contract can call");
        _;
    }

    modifier onlyKeeper() {
        require(msg.sender == keeper, "Only keeper can call");
        _;
    }

    constructor(
        address _lzEndpoint,
        address _owner,
        address _flowToken,
        address _appContract,
        uint32 _baseChainEid,
        bytes32 _rngContractAddress
    ) OApp(_lzEndpoint, _owner) Ownable(_owner) {
        flowToken = IERC20(_flowToken);
        appContract = IApp(_appContract);
        keeper = _owner;
        baseChainEid = _baseChainEid;
        rngContractAddress = _rngContractAddress;
        lastDrawTimestamp = block.timestamp;
    }

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


    // --- CORRECTED FUNCTION ---
    /**
     * @notice Called by the keeper to request a random number from the Base contract.
     * @dev This is a payable function, as the keeper must pay the LayerZero messaging fee.
     */
    function requestRandomWinner() external onlyKeeper payable {
        require(block.timestamp >= lastDrawTimestamp + DRAW_INTERVAL, "Draw interval not passed");
        require(participants.length > 0, "No participants in the pool");

        // The message payload is empty as we are just triggering the remote contract.
        bytes memory message = abi.encode("");
        // Options to airdrop gas on the destination chain (Base) for execution.
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);

        // Quote the fee required for the LayerZero message.
        MessagingFee memory fee = _quote(baseChainEid, message, options, false);
        require(msg.value >= fee.nativeFee, "LotteryPool: Insufficient fee.");

        // Send the message to the RngSenderBase contract on the Base chain.
        _lzSend(
            baseChainEid,
            message,
            options,
            fee,
            payable(msg.sender) // Refund excess fees to the keeper
        );

        emit DrawRequested(baseChainEid, rngContractAddress);
    }
    // --- END OF CORRECTION ---

    /**
     * @notice Receives the random number back from the RngSenderBase contract.
     */
    function _lzReceive(Origin calldata _origin, bytes32 /*_guid*/, bytes calldata _message, address /*_executor*/, bytes calldata /*_extraData*/) internal override {
        // Verify the message comes from the authorized RNG contract on the Base chain.
        require(_origin.srcEid == baseChainEid && _origin.sender == rngContractAddress, "Unauthorized sender");
        
        // Decode the random number and select the winner.
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

        // Reset stakes and participant list for the next round
        for (uint i = 0; i < participants.length; i++) {
            delete participantStakes[participants[i]];
        }
        delete participants;

        (bool success, ) = payable(winner).call{value: amountWon}("");
        require(success, "Transfer failed");
        emit WinnerSelected(winner, amountWon);
    }
    
    function withdraw(address payable _to) external onlyOwner {
        _to.transfer(address(this).balance);
    }

    receive() external payable {}
}
