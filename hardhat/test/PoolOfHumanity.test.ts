import { assert, expect } from "chai";
import { HumanityVerifier__factory, UpdateVerifier__factory, TestPOH__factory, PoolOfHumanity__factory, TestPOH, PoolOfHumanity } from "../typechain-types";

import { ethers } from "hardhat";
import { ContractFactory, BigNumber, BigNumberish, utils as etherUtils } from "ethers";

// @ts-ignore
import { buildPoseidon, poseidonContract } from "circomlibjs";

// @ts-ignore
import { plonk, plonkExportSolidityCallData } from "snarkjs";
import path from "path";
import { PoolState } from "../src/poolState";

// @ts-ignore
import * as ffjavascript from "ffjavascript";

import * as web3 from "@nomiclabs/hardhat-web3";


function poseidonHash(poseidon: any, inputs: BigNumberish[]): string {
    const hash = poseidon(inputs.map((x) => BigNumber.from(x).toBigInt()));
    const hashStr = poseidon.F.toString(hash);
    const hashHex = BigNumber.from(hashStr).toHexString();
    return ethers.utils.hexZeroPad(hashHex, 32);
}

function toBytesLike(value: BigNumberish): string {
    return ethers.utils.hexZeroPad(ethers.utils.hexlify(value), 32);
}

function toBytesLikeArray(values: BigNumberish[]): string[] {
    return values.map(toBytesLike);
}

async function prove(input: any, wasm: string, zkey: string): Promise<any> {
    const wasmPath = path.join(__dirname, wasm);
    const zkeyPath = path.join(__dirname, zkey);
    const { proof, publicSignals } = await plonk.fullProve(input, wasmPath, zkeyPath);
    return `0x${await plonkExportSolidityCallData(proof)}`;
}

interface HumanityProofInputs {
    currentTime: BigNumberish;
    root: BigNumberish;
    pathElements: BigNumberish[];
    pathIndices: BigNumberish[];
    privateKey: BigNumberish;
    submissionTime: BigNumberish;
    submissionDuration: BigNumberish;
    appID: BigNumberish;
}

async function proveHumanity(input: HumanityProofInputs): Promise<any> {
    console.time("proveHumanity");
    const proof = await prove(input,
                    "../circuits/build/humanity_verifier/HumanityVerifier_js/HumanityVerifier.wasm",
                    "../circuits/build/humanity_verifier/HumanityVerifier_final.zkey")
    console.timeEnd("proveHumanity");
    return proof;
}

interface UpdateProofInputs {
    pubKey: BigNumberish;
    currSubmissionTime: BigNumberish;
    currRegistered: BigNumberish;
    currPath: BigNumberish[];
    pathElements: BigNumberish[];
    pathIndices: BigNumberish[];
    updatedSubmissionTime: BigNumberish;
    updatedRegistered: BigNumberish;
    updatedPath: BigNumberish[];
}

async function proveUpdate(input: UpdateProofInputs): Promise<any> {
    console.time("proveUpdate");
    const proof = await prove(input,
        "../circuits/build/update_verifier/UpdateVerifier_js/UpdateVerifier.wasm",
        "../circuits/build/update_verifier/UpdateVerifier_final.zkey")
    console.timeEnd("proveUpdate");
    return proof;
}

function getPoseidonFactory(nInputs: number) {
    const bytecode = poseidonContract.createCode(nInputs);
    const abiJson = poseidonContract.generateABI(nInputs);
    const abi = new ethers.utils.Interface(abiJson);
    return new ContractFactory(abi, bytecode);
}

async function generatePoolKeys(poseidon: any): Promise<[string, string]> {
    const privateKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const publicKey = poseidonHash(poseidon, [privateKey]);
    return [privateKey, publicKey];
}

async function getCurveFromName(name: any) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await ffjavascript.buildBn128();
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await ffjavascript.buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n: any) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }
}

const { unstringifyBigInts } = ffjavascript.utils;

function i2hex(i: any) {
    return ("0" + i.toString(16)).slice(-2);
}

async function plonkExportSolidityCallData(_proof: any) {
    const proof = unstringifyBigInts(_proof);

    const curve = await getCurveFromName(proof.curve);
    const G1 = curve.G1;
    const Fr = curve.Fr;

    const proofBuff = new Uint8Array(G1.F.n8*2*9 + Fr.n8*7);
    G1.toRprUncompressed(proofBuff, 0, G1.e(proof.A));
    G1.toRprUncompressed(proofBuff, G1.F.n8*2, G1.e(proof.B));
    G1.toRprUncompressed(proofBuff, G1.F.n8*4, G1.e(proof.C));
    G1.toRprUncompressed(proofBuff, G1.F.n8*6, G1.e(proof.Z));
    G1.toRprUncompressed(proofBuff, G1.F.n8*8, G1.e(proof.T1));
    G1.toRprUncompressed(proofBuff, G1.F.n8*10, G1.e(proof.T2));
    G1.toRprUncompressed(proofBuff, G1.F.n8*12, G1.e(proof.T3));
    G1.toRprUncompressed(proofBuff, G1.F.n8*14, G1.e(proof.Wxi));
    G1.toRprUncompressed(proofBuff, G1.F.n8*16, G1.e(proof.Wxiw));
    Fr.toRprBE(proofBuff, G1.F.n8*18 , Fr.e(proof.eval_a));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8, Fr.e(proof.eval_b));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*2, Fr.e(proof.eval_c));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*3, Fr.e(proof.eval_s1));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*4, Fr.e(proof.eval_s2));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*5, Fr.e(proof.eval_zw));
    Fr.toRprBE(proofBuff, G1.F.n8*18 + Fr.n8*6, Fr.e(proof.eval_r));

    return Array.from(proofBuff).map(i2hex).join("");
}

async function updatePoolSubmission(poolState: PoolState, 
    poolContract: PoolOfHumanity, 
    address: string, 
    publicKey: string, 
    submissionTime: number,
    registered: boolean) {

    const userInfo = await poolState.addressToIndex.get(address);
    if (userInfo === undefined) {
        throw new Error("user info is undefined");
    }

    let currPath = await poolState.merkleTree.path(userInfo.index);
    let updatedPath = await poolState.updatedPath(address, submissionTime, true);
    if (updatedPath === undefined) {
        throw new Error("updated path is undefined");
    }

    let updateInputs : UpdateProofInputs = {
        pubKey: publicKey,
        currSubmissionTime: userInfo.submissionTime,
        currRegistered: userInfo.registered ? 1 : 0,
        currPath: currPath.path,
        pathElements: currPath.path_elements,
        pathIndices: currPath.path_index,
        updatedSubmissionTime: submissionTime,
        updatedRegistered: registered ? 1 : 0,
        updatedPath: updatedPath
    };
    const updateProof = await proveUpdate(updateInputs);
    await poolContract.updateSubmission(
         address,
         updateInputs.currSubmissionTime,
         updateInputs.currRegistered,
         toBytesLikeArray(updateInputs.currPath), 
         toBytesLikeArray(updateInputs.updatedPath),
         updateProof);
}

describe("PoolOfHumanity", function () {
    let signers : any;
    let poseidon : any;
    let testPOH : TestPOH;
    let poolOfHumanity : PoolOfHumanity;

    const depositAmount = etherUtils.parseEther("0.05");

    before(async () => {
        poseidon = await buildPoseidon();
    });

    beforeEach(async function () {
        signers = await ethers.getSigners();
        const humanityVerifier = await new HumanityVerifier__factory(signers[0]).deploy();
        const updateVerifier = await new UpdateVerifier__factory(signers[0]).deploy();
        const poseidon2 = await getPoseidonFactory(2).connect(signers[0]).deploy();
        const poseidon3 = await getPoseidonFactory(3).connect(signers[0]).deploy();
        testPOH = await new TestPOH__factory(signers[0]).deploy(63115200);
        poolOfHumanity = await new PoolOfHumanity__factory().connect(signers[0]).deploy(humanityVerifier.address, updateVerifier.address, testPOH.address, poseidon2.address, poseidon3.address);
    });

    it("register update two accounts", async function() {
        const [privateKey1, publicKey1] = await generatePoolKeys(poseidon);
        const [privateKey2, publicKey2] = await generatePoolKeys(poseidon);
        const poolState = new PoolState(20, poseidon);

        // Register first user into pool
        await testPOH.updateSubmission(signers[1].address, 0, true, 1672363114);
        await poolOfHumanity.connect(signers[1]).register(publicKey1, {value: depositAmount})
        await poolState.register(signers[1].address, 0, publicKey1, 1672363114);
        expect(await poolState.merkleTree.root()).to.equal(await poolOfHumanity.roots(await poolOfHumanity.currentRootIndex()));

        // Register second user into pool
        await testPOH.updateSubmission(signers[2].address, 0, true, 1672363214);
        await poolOfHumanity.connect(signers[2]).register(publicKey2, {value: depositAmount});
        await poolState.register(signers[2].address, 1, publicKey2, 1672363214);
        expect(await poolState.merkleTree.root()).to.equal(await poolOfHumanity.roots(await poolOfHumanity.currentRootIndex()));

        // Update submission time of first user
        await testPOH.updateSubmission(signers[1].address, 0, true, 1672363214);
        await updatePoolSubmission(poolState, poolOfHumanity, signers[1].address, publicKey1, 1672363214, true);
        await poolState.update(signers[1].address, 1672363214, true);
        expect(await poolState.merkleTree.root()).to.equal(await poolOfHumanity.roots(await poolOfHumanity.currentRootIndex()));

        // Update submission time of second user
        await testPOH.updateSubmission(signers[2].address, 0, true, 1672363314);
        await updatePoolSubmission(poolState, poolOfHumanity, signers[2].address, publicKey2, 1672363314, true);
        await poolState.update(signers[2].address, 1672363314, true);
        expect(await poolState.merkleTree.root()).to.equal(await poolOfHumanity.roots(await poolOfHumanity.currentRootIndex()));

        // Check Humanity for second user
        const appID = 919191;
        const expectedAppNullifier = poseidonHash(poseidon, [privateKey2, appID, 42]);
        const inputs : HumanityProofInputs = {
            currentTime: 1672363314 + 100,
            root: await poolState.merkleTree.root(),
            pathElements: (await poolState.merkleTree.path(1)).path_elements,
            pathIndices: (await poolState.merkleTree.path(1)).path_index,
            privateKey: privateKey2,
            submissionTime: 1672363314,
            submissionDuration: 63115200,
            appID: appID
        }
        const proof = await proveHumanity(inputs);
        const result = await poolOfHumanity.checkHumanity(toBytesLike(inputs.root), inputs.currentTime, appID, expectedAppNullifier, proof);
        expect(result).to.equal(true);

        // Unregister second user
        const currPath = await poolState.merkleTree.path(1);
        const updatedPath = await poolState.updatedPath(signers[2].address, 1672363314, false);
        if (updatedPath === undefined) {
            throw new Error("updated path is undefined");
        }    
        const updateInputs : UpdateProofInputs = {
            pubKey: publicKey2,
            currSubmissionTime: 1672363314,
            currRegistered: 1,
            currPath: currPath.path,
            pathElements: currPath.path_elements,
            pathIndices: currPath.path_index,
            updatedSubmissionTime: 1672363314,
            updatedRegistered: 0,
            updatedPath: updatedPath
        };
        const updateProof = await proveUpdate(updateInputs);
        await poolOfHumanity.connect(signers[2]).unregister(
            updateInputs.currSubmissionTime,
            toBytesLikeArray(updateInputs.currPath), 
            toBytesLikeArray(updateInputs.updatedPath),
            updateProof);
        await poolState.update(signers[2].address, 1672363314, false);
        expect(await poolState.merkleTree.root()).to.equal(await poolOfHumanity.roots(await poolOfHumanity.currentRootIndex()));
    }).timeout(1000000);
});

/*
Times: 
proveUpdate: 1:21.007 (m:ss.mmm)
proveUpdate: 1:20.661 (m:ss.mmm)
proveHumanity: 29.487s
proveUpdate: 1:23.113 (m:ss.mmm)

·---------------------------------------|---------------------------|--------------|-----------------------------·
|         Solc version: 0.8.17          ·  Optimizer enabled: true  ·  Runs: 1000  ·  Block limit: 30000000 gas  │
········································|···························|··············|······························
|  Methods                                                                                                       │
···················|····················|·············|·············|··············|···············|··············
|  Contract        ·  Method            ·  Min        ·  Max        ·  Avg         ·  # calls      ·  usd (avg)  │
···················|····················|·············|·············|··············|···············|··············
|  PoolOfHumanity  ·  register          ·     889808  ·     912116  ·      900962  ·            2  ·          -  │
···················|····················|·············|·············|··············|···············|··············
|  PoolOfHumanity  ·  unregister        ·          -  ·          -  ·      543605  ·            1  ·          -  │
···················|····················|·············|·············|··············|···············|··············
|  PoolOfHumanity  ·  updateSubmission  ·     543526  ·     547573  ·      545550  ·            2  ·          -  │
···················|····················|·············|·············|··············|···············|··············
|  TestPOH         ·  updateSubmission  ·      30296  ·      91683  ·       56715  ·            4  ·          -  │
···················|····················|·············|·············|··············|···············|··············
|  Deployments                          ·                                          ·  % of limit   ·             │
········································|·············|·············|··············|···············|··············
|  HumanityVerifier                     ·          -  ·          -  ·     1425006  ·        4.8 %  ·          -  │
········································|·············|·············|··············|···············|··············
|  PoolOfHumanity                       ·          -  ·          -  ·     3635736  ·       12.1 %  ·          -  │
········································|·············|·············|··············|···············|··············
|  TestPOH                              ·          -  ·          -  ·      371109  ·        1.2 %  ·          -  │
········································|·············|·············|··············|···············|··············
|  UpdateVerifier                       ·          -  ·          -  ·     3330381  ·       11.1 %  ·          -  │
·---------------------------------------|-------------|-------------|--------------|---------------|-------------·
*/