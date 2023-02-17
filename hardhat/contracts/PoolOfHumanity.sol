// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MerkleTreeWithHistory.sol";

interface PlonkVerifier {
    function verifyProof(
        bytes memory proof,
        uint[] memory pubSignals
    ) external view returns (bool);
}

// Interface for the Poseidon hash function for 3 inputs.
interface IHasher3 {
    function poseidon(bytes32[3] calldata leftRight)
        external
        pure
        returns (bytes32);
}

// Status of a submission in the Proof of Humanity.
enum Status {
    None,
    Vouching,
    PendingRegistration,
    PendingRemoval
}

// Interface for the Proof of Humanity contract.
interface IProofOfHumanity {
    function submissionDuration() external view returns (uint64);

    function getSubmissionInfo(address _submissionID) external view returns (
            Status status,
            uint64 submissionTime,
            uint64 index,
            bool registered,
            bool hasVouched,
            uint numberOfRequests
        );
}

/**
 *  @title PoolOfHumanity
 *  This contract manages a pool of users who are registered for the Proof of Humanity. Users who have a submission in the Proof of
 *  Humanity that has finised vouching and is not currently being challenged can register for the Pool. Users can then
 *  prove that they have a submission in the Proof of Humanity without revealing their identity.
 * 
 *  Registration to the pool requires a small deposit, which is returned if the user unregisters. If the user's Proof of Humanity
 *  registration is revoked, the deposit can be claimed by someone who updates the revoked user's registration in the pool.
 */
contract PoolOfHumanity is MerkleTreeWithHistory {

    event Registered(address indexed user, uint index, bytes32 pubKey, uint submissionTime);
    event Updated(address indexed user, uint submissionTime, bool registered);

    uint32 constant HEIGHT = 20; // Height of the merkle tree

    uint public depositAmount = 0.05 ether;

    PlonkVerifier public immutable humanityVerifier;
    PlonkVerifier public immutable updateVerifier;
    IProofOfHumanity public immutable poh;
    IHasher3 public immutable hasher3;

    mapping (address => bytes32) public users; // Maps users to their public key

    constructor(
        address _humanityVerifier,
        address _updateVerifier,
        address _poh,
        address _hasher2,
        address _hasher3
    ) MerkleTreeWithHistory(HEIGHT, _hasher2) {
        humanityVerifier = PlonkVerifier(_humanityVerifier);
        updateVerifier = PlonkVerifier(_updateVerifier);
        poh = IProofOfHumanity(_poh);
        hasher3 = IHasher3(_hasher3);
    }

    /**
     *  @dev Registers a user for the pool. The user must have a submission in the Proof of Humanity that has finished vouching
     *  and is not currently being challenged.
     *  @param pubkey The user's public key. The public key is the poseidon hash of the private key. This private key is required
     *  to verify a user's registration in the pool.
     */
    function register(bytes32 pubkey) public payable {
        require(users[msg.sender] == 0, "already in pool");
        require(msg.value == depositAmount, "incorrect deposit amount");

        Status  status;
        uint64 submissionTime;
        bool registered; 
        (status, submissionTime, , registered, , ) = poh.getSubmissionInfo(msg.sender);

        require(registered, "not registered");
        require(status == Status.None, "incorrect status");

        bytes32 submissionTimeB = bytes32(uint256(submissionTime));
        bytes32[3] memory leafHashElements = [pubkey, submissionTimeB, bytes32(uint(1))];
        bytes32 leafHash = hasher3.poseidon(leafHashElements);

        uint index = _insert(leafHash);
        emit Registered(msg.sender, index, pubkey, submissionTime);

        users[msg.sender] = pubkey;
    }

    /**
     *  @dev Updates a submission in the pool to match the user's current submission in the Proof of Humanity.
        *  If the user's registration status changes from true => false, the deposit will be returned to the caller.
        *  If the user's registration status changes from false => true, the deposit amount must be paid.
        *  @param user The address of the user whose submission is being updated.
        *  @param previousSubmissionTime The submission time of the user's previous submission in the pool.
        *  @param previouslyRegistered Whether the user's previous submission in the pool was registered.
        *  @param currentPath The path of the user's submission in the merkle tree to the root.
        *  @param updatedPath The path of the user's updated submission in the merkle tree to the root.
        *  @param proof The plonk proof data.
     */
    function updateSubmission(
            address user,
            uint previousSubmissionTime,
            uint previouslyRegistered,
            bytes32[] memory currentPath,
            bytes32[] memory updatedPath,
            bytes memory proof
    ) public payable {
        require(roots[currentRootIndex] == currentPath[20], "current root not on current path");

        Status status;
        uint64 submissionTime;
        bool registered;
        (status, submissionTime, , registered, , ) = poh.getSubmissionInfo(user);

        require(status == Status.None, "incorrect status");

        // If the user was not previously registered, they must pay the deposit
        if (previouslyRegistered == 0 && registered == true) {
            require(msg.value == depositAmount, "incorrect deposit amount");
        }

        bytes32 pubKey = users[user];

        uint[] memory inputs = new uint[](2 * HEIGHT + 7);
        inputs[0] = uint(pubKey);
        inputs[1] = uint(previousSubmissionTime);
        inputs[2] = previouslyRegistered;
        for (uint i = 0; i < HEIGHT + 1; i++) {
            inputs[i + 3] = uint(currentPath[i]);
        }
        inputs[HEIGHT + 4] = uint(submissionTime);
        inputs[HEIGHT + 5] = uint(registered ? 1 : 0);
        for (uint i = 0; i < HEIGHT + 1; i++) {
            inputs[i + 6 + HEIGHT] = uint(updatedPath[i]);
        }
        require(updateVerifier.verifyProof(proof, inputs),  "update not verified");

        _update(currentPath, updatedPath);

        emit Updated(msg.sender, submissionTime, registered);
    }

    /**
     *  @dev Unregisters a user from the pool. Returns the deposit to the user.
     *  @param submissionTime The user's submission time.
     *  @param currentPath The current path of the user's registration in the merkle tree.
     *  @param updatedPath The updated path of the user's registration in the merkle tree after setting
     *  the user's registration to false.
     *  @param proof The plonk proof data.
     */
    function unregister(
            uint submissionTime,
            bytes32[] memory currentPath,
            bytes32[] memory updatedPath,
            bytes memory proof
    ) public {
        require(users[msg.sender] != 0, "not in pool");

        bytes32 pubkey = users[msg.sender];
        uint[] memory inputs = new uint[](2 * HEIGHT + 7);
        inputs[0] = uint(pubkey);
        inputs[1] = uint(submissionTime);
        inputs[2] = 1;
        for (uint i = 0; i < HEIGHT + 1; i++) {
            inputs[i + 3] = uint(currentPath[i]);
        }
        inputs[HEIGHT + 4] = uint(submissionTime);
        inputs[HEIGHT + 5] = uint(0);
        for (uint i = 0; i < HEIGHT + 1; i++) {
            inputs[i + 6 + HEIGHT] = uint(updatedPath[i]);
        }
        require(updateVerifier.verifyProof(proof, inputs),  "update not verified");
        _update(currentPath, updatedPath);
        emit Updated(msg.sender, submissionTime, false);
        
        (bool ok, ) = payable(msg.sender).call{value: depositAmount}("");
        require(ok == true, "transfer failed");
    }

    /**
     *  @dev Checks if a user is registered in the pool and their submission is not yet expired
     *  @param root The root of the merkle tree used to generate the proof
     *  @param currentTime The current timestamp used to generate the proof
     *  @param appID The application ID used to generate the proof
     *  @param expectedAppNullifier poseidonHash (privateKey, appID, 42)
     *  @param proof The plonk proof data.
     *  @return True if the user is registered in the pool, false otherwise.
     */
    function checkHumanity(
        bytes32 root,
        uint currentTime,
        uint appID,
        uint expectedAppNullifier,
        bytes memory proof
    ) public view returns (bool) {
        require(isKnownRoot(root), "unknown root");
        uint[] memory inputs = new uint[](5);
        inputs[0] = expectedAppNullifier;
        inputs[1] = currentTime;
        inputs[2] = appID;
        inputs[3] = uint(root);
        inputs[4] = uint(poh.submissionDuration());
        return humanityVerifier.verifyProof(proof, inputs);
    }
}