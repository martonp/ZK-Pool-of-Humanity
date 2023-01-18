pragma circom 2.0.2;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "MerkleTree.circom";

// This circuit verifies that a user is human by checking that 
// - poseidon(privateKey) = publicKey
// - the hash of (publicKey, submissionTime, 1) is in the merkle tree
// - the submissionTime + submissionDuration > currentTime
// - the appNullifier = poseidon(privateKey, appID, 42)
template CheckHumanity(levels) {
    signal input currentTime;

    signal input appID;

    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal input privateKey;
    signal input submissionTime;
    signal input submissionDuration;

    signal output appNullifier;

    component lessThan = LessThan(35);
    lessThan.in[0] <== currentTime;
    lessThan.in[1] <== submissionTime + submissionDuration;
    lessThan.out === 1;

    component pubKeyHasher = Poseidon(1);
    pubKeyHasher.inputs[0] <== privateKey;

    component appNullifierHasher = Poseidon(3);
    appNullifierHasher.inputs[0] <== privateKey;
    appNullifierHasher.inputs[1] <== appID;
    appNullifierHasher.inputs[2] <== 42;
    appNullifier <== appNullifierHasher.out;

    component leafHasher = Poseidon(3);
    leafHasher.inputs[0] <== pubKeyHasher.out;
    leafHasher.inputs[1] <== submissionTime;
    leafHasher.inputs[2] <== 1; // 1 for registered, 0 for unregistered 

    component treeChecker = MerkleTreeChecker(levels);
    treeChecker.leaf <== leafHasher.out;
    treeChecker.root <== root;
    treeChecker.pathElements <== pathElements;
    treeChecker.pathIndices <== pathIndices;
}

component main {public [currentTime, submissionDuration, root, appID] } = CheckHumanity(20);