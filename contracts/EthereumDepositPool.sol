// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EthereumDepositPool {
    // Events
    event Deposit(
        bytes32 indexed commitment,
        uint256 amount,
        address indexed sender,
        uint256 timestamp
    );
    
    event Withdrawal(
        bytes32 indexed nullifierHash,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    // State variables
    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullifiers;
    
    // Accepted deposit amounts (in wei)
    uint256[] public acceptedAmounts = [
        0.005 ether, // Minimal amount for mainnet testing
        0.01 ether,  // Added for testing
        0.1 ether,
        1 ether,
        10 ether,
        100 ether
    ];
    
    // ICP canister principal (for admin functions)
    address public icpCanister;
    
    // Modifiers
    modifier onlyICP() {
        require(msg.sender == icpCanister, "Only ICP canister can call");
        _;
    }
    
    // Constructor
    constructor(address _icpCanister) {
        icpCanister = _icpCanister;
    }
    
    // Deposit function
    function deposit(bytes32 _commitment) external payable {
        require(isAcceptedAmount(msg.value), "Invalid deposit amount");
        require(!commitments[_commitment], "Duplicate commitment");
        
        commitments[_commitment] = true;
        
        emit Deposit(_commitment, msg.value, msg.sender, block.timestamp);
    }
    
    // Withdrawal function (called by ICP canister)
    function processWithdrawal(
        bytes32 _nullifierHash,
        address payable _recipient,
        uint256 _amount
    ) external onlyICP {
        require(!nullifiers[_nullifierHash], "Nullifier already used");
        require(address(this).balance >= _amount, "Insufficient contract balance");
        
        nullifiers[_nullifierHash] = true;
        
        (bool success, ) = _recipient.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(_nullifierHash, _recipient, _amount, block.timestamp);
    }
    
    // Check if amount is accepted
    function isAcceptedAmount(uint256 _amount) public view returns (bool) {
        for (uint i = 0; i < acceptedAmounts.length; i++) {
            if (acceptedAmounts[i] == _amount) {
                return true;
            }
        }
        return false;
    }
    
    // Get contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Check if commitment exists
    function commitmentExists(bytes32 _commitment) external view returns (bool) {
        return commitments[_commitment];
    }
    
    // Check if nullifier is used
    function nullifierUsed(bytes32 _nullifierHash) external view returns (bool) {
        return nullifiers[_nullifierHash];
    }
    
    // Update ICP canister address (only current ICP canister can call)
    function updateICPCanister(address _newICPCanister) external onlyICP {
        icpCanister = _newICPCanister;
    }
    
    // Emergency pause (implement pause pattern if needed)
    // Emergency withdrawal (implement if needed with proper controls)
}