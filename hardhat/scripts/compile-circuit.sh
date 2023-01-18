#!/bin/bash

cd circuits
mkdir -p build
mkdir -p build/humanity_verifier
mkdir -p build/update_verifier

if [ -f ./build/powersOfTau28_hez_final_15.ptau ]; then
    echo "powersOfTau28_hez_final_15.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_15.ptau'
    cd build
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau
    cd ..
fi

cd build/humanity_verifier
circom ../../HumanityVerifier.circom --r1cs --wasm --sym -o .
snarkjs r1cs info HumanityVerifier.r1cs
snarkjs groth16 setup HumanityVerifier.r1cs ../powersOfTau28_hez_final_15.ptau HumanityVerifier_0000.zkey
snarkjs zkey contribute HumanityVerifier_0000.zkey HumanityVerifier_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey HumanityVerifier_final.zkey verification_key.json
snarkjs zkey export solidityverifier HumanityVerifier_final.zkey ../../../contracts/HumanityVerifier.sol

cd ../update_verifier
circom ../../UpdateVerifier.circom --r1cs --wasm --sym -o .
snarkjs r1cs info UpdateVerifier.r1cs
snarkjs groth16 setup UpdateVerifier.r1cs ../powersOfTau28_hez_final_15.ptau UpdateVerifier_0000.zkey
snarkjs zkey contribute UpdateVerifier_0000.zkey UpdateVerifier_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey UpdateVerifier_final.zkey verification_key.json
snarkjs zkey export solidityverifier UpdateVerifier_final.zkey ../../../contracts/UpdateVerifier.sol

cd ../../