import { BigNumber, utils as etherUtils } from "ethers"
import { MerkleTree } from "./merkleTree"

function poseidonHash(poseidon, inputs) {
  const hash = poseidon(inputs.map(x => BigNumber.from(x).toBigInt()))
  const hashStr = poseidon.F.toString(hash)
  const hashHex = BigNumber.from(hashStr).toHexString()
  return etherUtils.hexZeroPad(hashHex, 32)
}

class PoseidonHasher {
  constructor(poseidon) {
    this.poseidon = poseidon
  }

  hash(left, right) {
    return poseidonHash(this.poseidon, [left, right])
  }
}

export class PoolState {
  constructor(poseidon) {
    this.n_levels = 20;

    this.merkleTree = new MerkleTree(
      this.n_levels,
      "test",
      new PoseidonHasher(poseidon)
    )
    this.addressToIndex = new Map()
    this.poseidon = poseidon
  }

  userInfo(address) {
    return this.addressToIndex.get(address);
  }

  async register(address, index, pubKey, submissionTime) {
    if (this.addressToIndex.has(address)) {
      return
    }
    const leaf = poseidonHash(this.poseidon, [pubKey, submissionTime, 1])
    const userInfo = { index: Number(index), pubKey, submissionTime, registered: true }
    this.addressToIndex.set(address, userInfo)
    return await this.merkleTree.insert(leaf)
  }

  async update(address, submissionTime, registered) {
    if (!this.addressToIndex.has(address)) {
      return
    }
    const userInfo = this.addressToIndex.get(address)
    if (!userInfo) return
    const leaf = poseidonHash(this.poseidon, [
      userInfo.pubKey,
      submissionTime,
      registered ? 1 : 0
    ])
    userInfo.submissionTime = submissionTime
    userInfo.registered = registered
    return await this.merkleTree.update(userInfo.index, leaf)
  }

  async updatedPath(address, submissionTime, registered) {
    if (!this.addressToIndex.has(address)) {
      return
    }
    const userInfo = this.addressToIndex.get(address)
    if (!userInfo) return
    const leaf = poseidonHash(this.poseidon, [
      userInfo.pubKey,
      submissionTime,
      registered ? 1 : 0
    ])
    const updatedPath = await this.merkleTree.updatedPath(userInfo.index, leaf)
    return updatedPath.slice(1)
    }
}
