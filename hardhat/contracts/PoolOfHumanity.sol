// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MerkleTreeWithHistory.sol";

// Interface for the humanity verifier contract.
interface IHumanityVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[4] calldata input
    ) external view returns (bool);
}

// Interface for the update verifier contract.
interface IUpdateVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[47] calldata input
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
    function getHumanityInfo(bytes20 _humanityId)
        external
        view
        returns (
            bool vouching,
            bool pendingRevocation,
            uint64 nbPendingRequests,
            uint64 expirationTime,
            address owner,
            uint256 nbRequests
        );
}

/**
 *  @title PoolOfHumanity
 *  This contract manages a pool of users who are registered for the Proof of Humanity. Users who have a submission in the Proof of
 *  Humanity that has finised vouching and is not currently being challenged can register for the Pool. Users can then
 *  prove that they have a submission in the Proof of Humanity without revealing their identity.
 */
contract PoolOfHumanity is MerkleTreeWithHistory {

    event Registered(bytes20 indexed humanityID, uint index, bytes32 pubKey, uint submissionTime);
    event Updated(bytes20 indexed humanityID, uint submissionTime, bool registered);

    uint32 constant HEIGHT = 20; // Height of the merkle tree

    IHumanityVerifier public immutable humanityVerifier;
    IUpdateVerifier public immutable updateVerifier;
    IProofOfHumanity public immutable poh;
    IHasher3 public immutable hasher3;

    mapping (bytes20 => bytes32) public humans; // Maps humanityID => pubKey

    constructor(
        address _humanityVerifier,
        address _updateVerifier,
        address _poh,
        address _hasher2,
        address _hasher3
    ) MerkleTreeWithHistory(HEIGHT, _hasher2) {
        humanityVerifier = IHumanityVerifier(_humanityVerifier);
        updateVerifier = IUpdateVerifier(_updateVerifier);
        poh = IProofOfHumanity(_poh);
        hasher3 = IHasher3(_hasher3);
    }

    /**
     *  @dev Registers a user for the pool. The user must have a submission in the Proof of Humanity that has finished vouching
     *  and is not currently being challenged.
     *  @param pubkey The user's public key. The public key is the poseidon hash of the private key. This private key is required
     *  to verify a user's registration in the pool.
     *  @param humanityID The user's humanityID.
     */
    function register(bytes32 pubkey, bytes20 humanityID) public payable {
        require(humans[humanityID] == 0, "already in pool");

        address owner;
        bool vouching;
        bool pendingRevocation;
        uint64 expirationTime;
        (vouching, pendingRevocation, , expirationTime, owner, ) = poh.getHumanityInfo(humanityID);

        require(owner == msg.sender, "incorrect owner");
        require(!vouching, "still vouching");
        require(!pendingRevocation, "pending revocation");

        bytes32 expirationTimeB = bytes32(uint256(expirationTime));
        bytes32[3] memory leafHashElements = [pubkey, expirationTimeB, bytes32(uint(1))];
        bytes32 leafHash = hasher3.poseidon(leafHashElements);

        uint index = _insert(leafHash);
        emit Registered(humanityID, index, pubkey, expirationTime);

        humans[humanityID] = pubkey;
    }

    /** 
     *  @dev Updates a submission in the pool to match the user's current submission in the Proof of Humanity.
     *  @param humanityID The humanityID of the user whose submission is being updated.
     *  @param previousExpirationTime The expiration time of the user's previous submission in the pool.
     *  @param previouslyRegistered Whether the user's previous submission in the pool was registered.
     *  @param currentPath The path of the user's submission in the merkle tree to the root.
     *  @param updatedPath The path of the user's updated submission in the merkle tree to the root.
     *  @param a The first part of the proof.
     *  @param b The second part of the proof.
     *  @param c The third part of the proof.
     */
    function updateSubmission(
            bytes20 humanityID,
            uint previousExpirationTime,
            uint previouslyRegistered,
            bytes32[] memory currentPath,
            bytes32[] memory updatedPath,
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c
    ) public payable {
        require(roots[currentRootIndex] == currentPath[20], "current root not on current path");

        address owner;
        bool vouching;
        bool pendingRevocation;
        uint64 expirationTime;
        (vouching, pendingRevocation, , expirationTime, owner, ) = poh.getHumanityInfo(humanityID);

        require(!vouching, "still vouching");
        require(!pendingRevocation, "pending revocation");

        bool registered = owner != address(0);
        bytes32 pubKey = humans[humanityID];

        uint[2 * HEIGHT + 7] memory inputs;
        inputs[0] = uint(pubKey);
        inputs[1] = uint(previousExpirationTime);
        inputs[2] = previouslyRegistered;
        for (uint i = 0; i < HEIGHT + 1; i++) {
            inputs[i + 3] = uint(currentPath[i]);
        }
        inputs[HEIGHT + 4] = uint(expirationTime);
        inputs[HEIGHT + 5] = uint(registered ? 1 : 0);
        for (uint i = 0; i < HEIGHT + 1; i++) {
            inputs[i + 6 + HEIGHT] = uint(updatedPath[i]);
        }
        require(updateVerifier.verifyProof(a, b, c, inputs),  "update not verified");

        _update(currentPath, updatedPath);

        emit Updated(humanityID, expirationTime, registered);
    }

    /**
     *  @dev Checks if a user is registered in the pool and their submission is not yet expired
     *  @param root The root of the merkle tree used to generate the proof
     *  @param currentTime The current timestamp used to generate the proof
     *  @param appID The application ID used to generate the proof
     *  @param expectedAppNullifier poseidonHash (privateKey, appID, 42)
     *  @param proof The ZK snark proof
     *  @return True if the user is registered in the pool, false otherwise.
     */
    function checkHumanity(
        bytes32 root,
        uint currentTime,
        uint appID,
        uint expectedAppNullifier,
        uint[8] memory proof
    ) external view returns (bool) {
        require(isKnownRoot(root), "unknown root");
        uint[2] memory a = [proof[0], proof[1]];
        uint[2][2] memory b = [[proof[2], proof[3]], [proof[4], proof[5]]];
        uint[2] memory c = [proof[6], proof[7]];
        uint[4] memory inputs = [expectedAppNullifier, currentTime, appID, uint(root)];

        return humanityVerifier.verifyProof(a, b, c, inputs);
    }
}