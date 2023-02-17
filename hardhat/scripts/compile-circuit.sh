#!/bin/bash

cd circuits
mkdir -p build
mkdir -p build/humanity_verifier
mkdir -p build/update_verifier

if [ -f ./build/powersOfTau28_hez_final_17.ptau ]; then
    echo "powersOfTau28_hez_final_17.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_17.ptau'
    cd build
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_17.ptau
    cd ..
fi

cd build/humanity_verifier
circom ../../HumanityVerifier.circom --r1cs --wasm --sym -o .
snarkjs r1cs info HumanityVerifier.r1cs
snarkjs plonk setup HumanityVerifier.r1cs ../powersOfTau28_hez_final_17.ptau HumanityVerifier_final.zkey
snarkjs zkey export verificationkey HumanityVerifier_final.zkey verification_key.json
snarkjs zkey export solidityverifier HumanityVerifier_final.zkey ../../../contracts/HumanityVerifier.sol

cd ../update_verifier
circom ../../UpdateVerifier.circom --r1cs --wasm --sym -o .
snarkjs r1cs info UpdateVerifier.r1cs
snarkjs plonk setup UpdateVerifier.r1cs ../powersOfTau28_hez_final_17.ptau UpdateVerifier_final.zkey
snarkjs zkey export verificationkey UpdateVerifier_final.zkey verification_key.json
snarkjs zkey export solidityverifier UpdateVerifier_final.zkey ../../../contracts/UpdateVerifier.sol

cd ../../