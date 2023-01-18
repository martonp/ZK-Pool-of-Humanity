import { BigNumber, BigNumberish, utils as etherUtils } from "ethers";
import { MerkleTree, Hasher } from "./merkleTree";

function poseidonHash(poseidon: any, inputs: BigNumberish[]): string {
    const hash = poseidon(inputs.map((x) => BigNumber.from(x).toBigInt()));
    const hashStr = poseidon.F.toString(hash);
    const hashHex = BigNumber.from(hashStr).toHexString();
    return etherUtils.hexZeroPad(hashHex, 32);
}

class PoseidonHasher implements Hasher {
    poseidon: any;

    constructor(poseidon: any) {
        this.poseidon = poseidon;
    }

    hash(left: string, right: string) {
        return poseidonHash(this.poseidon, [left, right]);
    }
}

interface UserInfo {
    index: number;
    pubKey: string;
    submissionTime: number;
    registered: boolean;
}

export class PoolState {
    public merkleTree: MerkleTree;
    public addressToIndex: Map<string, UserInfo>;

    poseidon: any;

    constructor(
        public n_levels: number,
        poseidon: any
    ) { 
        this.merkleTree = new MerkleTree(n_levels, "test", new PoseidonHasher(poseidon));
        this.addressToIndex = new Map();
        this.poseidon = poseidon;
    }

    async register(address: string, index: number, pubKey: string, submissionTime: number): Promise<void> {
        if (this.addressToIndex.has(address)) {
            return;
        }
        const leaf = poseidonHash(this.poseidon, [pubKey, submissionTime, 1]);
        const userInfo : UserInfo = {index, pubKey, submissionTime, registered: true};
        this.addressToIndex.set(address, userInfo);
        return await this.merkleTree.insert(leaf);
    }

    async update(address: string, submissionTime: number, registered: boolean): Promise<void> {
        if (!this.addressToIndex.has(address)) {
            return;
        }
        const userInfo = this.addressToIndex.get(address);
        if (!userInfo) return;
        userInfo.submissionTime = submissionTime;
        userInfo.registered = registered;
        const leaf = poseidonHash(this.poseidon, [userInfo.pubKey, submissionTime, registered ? 1 : 0]);
        return await this.merkleTree.update(userInfo.index, leaf);
    }

    async updatedPath(address: string, submissionTime: number, registered: boolean): Promise<string[] | undefined> {
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