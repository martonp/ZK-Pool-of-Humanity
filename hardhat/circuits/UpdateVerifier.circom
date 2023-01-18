pragma circom 2.0.2;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "MerkleTree.circom";

// This circuit verifies that a leaf with the hash of
// (pubKey, currSubmissionTime, currRegistered) is in the merkle tree.
// It then verifies that if that same leaf is updated with the hash of
// (pubKey, updatedSubmissionTime, updatedRegistered), then its path to the
// root will be equal to updatedPath.
template UpdateVerifier(levels) {
    signal input pubKey;

    signal input currSubmissionTime;
    signal input currRegistered;
    signal input currPath[levels + 1];

    signal input pathElements[levels];
    signal input pathIndices[levels];

    signal input updatedSubmissionTime;
    signal input updatedRegistered;
    signal input updatedPath[levels + 1];

    component currLeafHasher = Poseidon(3);
    currLeafHasher.inputs[0] <== pubKey;
    currLeafHasher.inputs[1] <== currSubmissionTime;
    currLeafHasher.inputs[2] <== currRegistered;
    currLeafHasher.out === currPath[0];

    component currPathFinder = MerkleTreePathFinder(levels);
    currPathFinder.leaf <== currLeafHasher.out;
    currPathFinder.pathElements <== pathElements;
    currPathFinder.pathIndices <== pathIndices;

    for (var i = 0; i < levels; i++) {
        currPath[i + 1] === currPathFinder.path[i];
    }

    component updatedLeafHasher = Poseidon(3);
    updatedLeafHasher.inputs[0] <== pubKey;
    updatedLeafHasher.inputs[1] <== updatedSubmissionTime;
    updatedLeafHasher.inputs[2] <== updatedRegistered;
    updatedLeafHasher.out === updatedPath[0];

    component pathFinder = MerkleTreePathFinder(levels);
    pathFinder.leaf <== updatedLeafHasher.out;
    pathFinder.pathElements <== pathElements;
    pathFinder.pathIndices <== pathIndices;

    for (var i = 0; i < levels; i++) {
        updatedPath[i + 1] === pathFinder.path[i];
    }
}

component main {public [pubKey, currSubmissionTime, currRegistered, updatedSubmissionTime, updatedRegistered, currPath, updatedPath] } = UpdateVerifier(20);