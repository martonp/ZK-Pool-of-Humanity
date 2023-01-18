import { generateUpdateProof } from '/static/genProofs';

export function ProofOfHumanityStatusName(state) {
    switch (Number(state)) {
        case 0:
            return "None";
        case 1:
            return "Vouching";
        case 2:
            return "Pending Registration";
        case 3:
            return "Pending Removal";
        default:
            return "Unknown";
    }
}

export async function GetUpdateInputs(poolState, updatedSubmissionTime, updatedRegistered, publicKey, account) {
    const userState = poolState.addressToIndex.get(account);
    const currentPath = await poolState.merkleTree.path(userState.index);
    updatedSubmissionTime = updatedSubmissionTime ? updatedSubmissionTime : userState.submissionTime;
    const updatedPath = await poolState.updatedPath(account, updatedSubmissionTime, updatedRegistered);

    const updateInputs = {
        pubKey: publicKey,
        currSubmissionTime: userState.submissionTime,
        currRegistered: userState.registered ? 1 : 0,
        currPath: currentPath.path,
        pathElements: currentPath.path_elements,
        pathIndices: currentPath.path_index,
        updatedSubmissionTime: updatedSubmissionTime ? updatedSubmissionTime : userState.submissionTime,
        updatedRegistered: updatedRegistered ? 1 : 0,
        updatedPath: updatedPath
    };

    const { solProof } = await generateUpdateProof(updateInputs);
    return { solProof, updatedPath, currSubmissionTime: userState.submissionTime, currRegistered: userState.registered, currPath: currentPath.path };
}
