const HumanityVerifierWASMFile = "../HumanityVerifier.wasm";
const HumanityVerifierKey = "../HumanityVerifier_final.zkey";
const UpdateVerifierWASMFile = "../UpdateVerifier.wasm";
const UpdateVerifierKey = "../UpdateVerifier_final.zkey";

export const generateHumanityProof = async (input) => {
    const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(
                                            input,
                                            HumanityVerifierWASMFile,
                                            HumanityVerifierKey
                                        );

    const solProof = {
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [
            [proof.pi_b[0][1], proof.pi_b[0][0]],
            [proof.pi_b[1][1], proof.pi_b[1][0]],
        ],
        c: [proof.pi_c[0], proof.pi_c[1]],
    };

    return { solProof, publicSignals };
}

export const generateUpdateProof = async (input) => {
    const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(
                                            input,
                                            UpdateVerifierWASMFile,
                                            UpdateVerifierKey
                                        );

    const solProof = {
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [
            [proof.pi_b[0][1], proof.pi_b[0][0]],
            [proof.pi_b[1][1], proof.pi_b[1][0]],
        ],
        c: [proof.pi_c[0], proof.pi_c[1]],
    };

    return { solProof, publicSignals };
}

