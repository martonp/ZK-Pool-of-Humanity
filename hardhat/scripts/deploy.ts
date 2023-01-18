import { ethers } from "hardhat";
import { HumanityVerifier__factory, UpdateVerifier__factory, TestPOH__factory, PoolOfHumanity__factory, TestPOH, PoolOfHumanity } from "../typechain-types";

// @ts-ignore
import { poseidonContract } from "circomlibjs";

function getPoseidonFactory(nInputs: number) {
  const bytecode = poseidonContract.createCode(nInputs);
  const abiJson = poseidonContract.generateABI(nInputs);
  const abi = new ethers.utils.Interface(abiJson);
  return new ethers.ContractFactory(abi, bytecode);
}

async function main() {
  const signers = await ethers.getSigners();
  const humanityVerifier = await new HumanityVerifier__factory(signers[0]).deploy();
  const updateVerifier = await new UpdateVerifier__factory(signers[0]).deploy();
  const poseidon2 = await getPoseidonFactory(2).connect(signers[0]).deploy();
  const poseidon3 = await getPoseidonFactory(3).connect(signers[0]).deploy();
  const testPOH = await new TestPOH__factory(signers[0]).deploy(63115200);
  const poolOfHumanity = await new PoolOfHumanity__factory(signers[0]).deploy(humanityVerifier.address, updateVerifier.address, testPOH.address, poseidon2.address, poseidon3.address);

  console.log(`TEST POH address is ${testPOH.address}`);
  console.log(`Pool of Humanity address is ${poolOfHumanity.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
