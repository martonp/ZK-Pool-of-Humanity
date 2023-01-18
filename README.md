# ZK Pool of Humanity

The ZK Pool of Humanity is an extension to Proof of Humanity that enables users to prove they have a Proof of Humanity
account without revealing their identity. Users with a fully registered Proof of Humanity account can add themselves to
a shielded pool of users (similar to how Z-Cash maintains shielded pools of money), and then they can produce ZK Snark
Proofs that prove they control one of those accounts.

Users are required to post a small deposit when registering, incentivizing people to remove accounts from the pool that
were challenged and deemed to be invalid in Proof of Humanity.

Applications that integrate the ZK Pool of Humanity can require an AppID to be included as input in the ZK Snark Proof. The ZK
Snark Proof will then output an "App Nullifier". A valid ZK Snark Proof for the same user and same app ID will always result
in the same "App Nullifier", so this allows applications to have user accounts for unique real humans, without revealing anything
about their identity.

A demo is hosted at: [https://zk-pool-of-humanity.herokuapp.com/](https://zk-pool-of-humanity.herokuapp.com/) 

## How it Works

### Registration

The ZK Pool of Humanity requires users to generate a new public/private key pair defined as:
```
  publicKey = poseidonHash( privateKey )
```
This is used instead of their existing ECDSA public/private key-pair because ECDSA is very expensive to prove in a ZK Snark.

The `private_key` can be any random number, but in order to interoperate with existing Ethereum wallets, the following is used:
```
  privateKey = keccack256( ecdsaSign( keccack256("poolofhumanity") ) )
```

Once a user's key pair has been generated, register for the ZK Pool of Humanity by adding the hash of the following peices of data to
a merkle tree:
- Public Key
- Proof of Humanity registration submission time
- Registered (A boolean)

A small deposit is required from users when registering to incentivize removal of accounts that have been removed from the Pool of Humanity.

### Verifying Humanity

The circuit generated by [HumanityVerifier.circom](https://github.com/martonp/ZK-Pool-of-Humanity/blob/master/hardhat/circuits/HumanityVerifier.circom)
can be used to prove knowledge of a private key that hashes to a public key that is included in the merkle tree and that the `submissionTime` + `submissionDuration` (defined by Proof of Humanity) is before the current time.

The `HumanityVerifier` circuit also takes an `AppID` as an input, and outputs an `AppNullifier`. The relationship between
the `AppID` and `AppNullifier` is the following: 
```
  AppNullifier = poseidonHash( privateKey, AppID, 42 )
```
This `AppNullifier` can be used as a user ID in each application while maintaining a user's privacy, becuase the `AppNullifier` cannot be linked back
to a user's public key.

### Updating the Pool

The ZK Pool of Humanity needs to be updated in the following cases:
- A user unregisters to reclaim their deposit
- A user resubmits their Proof of Humanity account because it is about to expire
- A Proof of Humanity registration is successfully challanged and removed

The first action can only be taken by the owner of the account, while the other two can be taken by anyone, as it just involves
syncing the Proof of Humanity registration with the data stored in the ZK Pool of Humanity. Since the entire merkle tree is not
stored on-chain, updates to existing leaves in the merkle tree must be proven to be valid using the circuit generated by
[UpdateVerifier.circom](https://github.com/martonp/ZK-Pool-of-Humanity/blob/master/hardhat/circuits/UpdateVerifier.circom).

If a update to a pool entry involves changing `registered` from `true -> false`, the pool will pay the caller the amount of the deposit. If
`registered` is changed from `false -> true`, the caller must pay a deposit.

### Key Files
- Solidity Contracts
  - [PoolOfHumanity.sol](https://github.com/martonp/ZK-Pool-of-Humanity/blob/master/hardhat/contracts/PoolOfHumanity.sol)
  - [MerkleTreeWithHistory.sol](https://github.com/martonp/ZK-Pool-of-Humanity/blob/master/hardhat/contracts/MerkleTreeWithHistory.sol)
- Circuits:
  - [HumanityVerifier.circom](https://github.com/martonp/ZK-Pool-of-Humanity/blob/master/hardhat/circuits/HumanityVerifier.circom)
  - [UpdateVerifier.circom](https://github.com/martonp/ZK-Pool-of-Humanity/blob/master/hardhat/circuits/UpdateVerifier.circom)
