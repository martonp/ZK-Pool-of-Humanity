import * as React from "react";
import { useWeb3React } from "@web3-react/core";
import { Button, Container, InputGroup, Form, Modal, Row, Col, Spinner } from 'react-bootstrap';
import PoolABI from "../utils/abi/PoolOfHumanity.json";
import { useContext } from 'react';
import { ContractsContext } from '../components/layout';
import Web3 from "web3";
import { buildPoseidon } from 'circomlibjs';
import { BigNumber, utils as ethersUtils } from "ethers";
import TestPOHABI from "../utils/abi/TestPOH.json";
import { Link } from "gatsby";
import { ProofOfHumanityStatusName, GetUpdateInputs } from "../utils/utils";
import * as moment from 'moment';
import { generateHumanityProof } from '/static/genProofs';
import Loading from "../components/Loading";

const depositAmount = ethersUtils.parseEther("0.05");

function poseidonHash(poseidon, inputs) {
    const hash = poseidon(inputs.map((x) => BigNumber.from(x).toBigInt()));
    const hashStr = poseidon.F.toString(hash);
    const hashHex = BigNumber.from(hashStr).toHexString();
    return ethersUtils.hexZeroPad(hashHex, 32);
}

const updatePoolEntry = async (connector, poolState, keys, updatedSubmissionTime, updatedRegistered) => {
    try {
        const { solProof, updatedPath, currSubmissionTime, currRegistered, currPath } =
            await GetUpdateInputs(poolState, updatedSubmissionTime, updatedRegistered, keys.PublicKey, keys.Account);
        const value = (currRegistered === false && updatedRegistered === true) ? depositAmount : 0;
        const provider = await connector.getProvider();
        const web3 = new Web3(provider);
        const pool = new web3.eth.Contract(PoolABI, process.env.GATSBY_POOL_CONTRACT);
        await pool.methods.updateSubmission(keys.Account, currSubmissionTime, currRegistered ? 1 : 0, currPath, updatedPath, solProof.a, solProof.b, solProof.c).send({ from: keys.Account, value }, (err, res) => {
            if (err) {
                console.log(err);
            } else {
                console.log(res);
            }
        });
    } catch (e) {
        console.log(e);
    }
}

const unregister = async (connector, poolState, keys) => {
    try {
        const userState = poolState.addressToIndex.get(keys.Account);
        const poseidon = await buildPoseidon();
        const leafHash = poseidonHash(poseidon, [keys.PublicKey, userState.submissionTime, 0]);
        const currentPath = await poolState.merkleTree.path(userState.index);
        const { solProof, updatedPath, currSubmissionTime, currPath } = await GetUpdateInputs(poolState, 0, false, keys.PublicKey, keys.Account);
        const provider = await connector.getProvider();
        const web3 = new Web3(provider);
        const pool = new web3.eth.Contract(PoolABI, process.env.GATSBY_POOL_CONTRACT);
        await pool.methods.unregister(currSubmissionTime, currPath, updatedPath, solProof.a, solProof.b, solProof.c).send({ from: keys.Account }, (err, res) => {
            if (err) {
                console.log(err);
            } else {
                console.log(res);
            }
        });
    } catch (e) {
        console.log(e);
    }
}

const layout = (contents) => {
    return (
        <Container style={{ marginTop: "20px", width: "60%" }}>
            {contents}
        </Container>);
};

const GenerateKeysButton = ({ keys, onClick }) => {
    if (keys) {
        return (<p>Pool of Humanity Public Key: {keys.PublicKey}</p>);
    }

    return (<div>
        <Button onClick={onClick}>Generate Pool Keys</Button>
        <p style={{ color: "red" }}><b>You must generate your pool keys before you can interact with your account.</b></p>
    </div>);
}

const GenerateKeysModal = ({ show, onHide, updateKeys }) => {
    const onClick = async () => {
        await updateKeys();
        onHide();
    }

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Generate Pool Keys</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Clicking the button below will generate a public/private key pair for the Pool of Humanity.</p>
                <p>These keys will be used to register and update your entry in the Pool of Humanity.</p>
                <p>You will be asked to sign <b>keccak256("poolofhumanity")</b> in your wallet.</p>
                <p>For your safety, confirm that you are signing the correct message by typing "poolofhumanity"
                    into this website: <a href="https://emn178.github.io/online-tools/keccak_256.html" target="_blank">https://emn178.github.io/online-tools/keccak_256.html</a>.
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                <Button variant="primary" onClick={onClick}>
                    Generate Keys
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

const UnregisterModal = ({ show, onHide, unregister }) => {
    let [unregistering, setUnregistering] = React.useState(false);

    const onClick = async () => {
        setUnregistering(true);
        await unregister();
        setUnregistering(false);
        onHide();
    }

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Unregister from Pool</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    If you unregister you will get back your <b>0.05 ETH</b> deposit, but you will no longer be able
                    to anonymously prove your humanity.
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                <Button variant="primary" onClick={onClick}>
                    Unregister
                </Button>
                <Spinner animation="border" hidden={!unregistering} style={{ marginLeft: "5px" }} size="sm" />
            </Modal.Footer>
        </Modal>
    )
}

const SyncRegistrationModal = ({ show, onHide, syncRegistration }) => {
    let [syncing, setSyncing] = React.useState(false);

    const onClick = async () => {
        setSyncing(true);
        await syncRegistration();
        setSyncing(false);
        onHide();
    }

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Sync Registration</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    Your registration information in the ZK Pool of Humanity does not match your
                    Pool of Humanity registration. Syncing them will make your registrations match.
                    If you are currently not registered in the ZK Pool of Humanity but are registered
                    in Proof of Humanity, you will have to pay the <b>0.05 ETH</b> deposit.

                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                <Button variant="primary" onClick={onClick}>
                    Sync Registration
                </Button>
                <Spinner animation="border" hidden={!syncing} style={{ marginLeft: "5px" }} size="sm" />
            </Modal.Footer>
        </Modal>
    )
}

const verifyHumanity = async (connector, keys, poolState, appID) => {
    const provider = await connector.getProvider();
    const web3 = new Web3(provider);
    const testPOH = new web3.eth.Contract(TestPOHABI, process.env.GATSBY_POH_CONTRACT)
    const submissionDuration = await testPOH.methods.submissionDuration().call();

    const userState = poolState.addressToIndex.get(keys.Account);
    const path = await poolState.merkleTree.path(userState.index);
    const currentTime = Math.floor((new Date()).getTime() / 1000);

    const inputs = {
        currentTime: currentTime,
        root: await poolState.merkleTree.root(),
        pathElements: path.path_elements,
        pathIndices: path.path_index,
        privateKey: keys.PrivateKey,
        submissionTime: userState.submissionTime,
        submissionDuration: submissionDuration,
        appID: appID
    }

    let { solProof, publicSignals } = await generateHumanityProof(inputs);

    const pool = new web3.eth.Contract(PoolABI, process.env.GATSBY_POOL_CONTRACT);
    const flatProof = [solProof.a[0], solProof.a[1], solProof.b[0][0], solProof.b[0][1], solProof.b[1][0], solProof.b[1][1], solProof.c[0], solProof.c[1]];
    const result = await pool.methods.checkHumanity(inputs.root, inputs.currentTime, appID, publicSignals[0], flatProof).call();
    console.log(`checkHumanity result: ${result}`);

    return {
        flattenedProof: flatProof,
        currentTime: publicSignals[1],
        appNullifier: publicSignals[0],
        root: inputs.root,
        appID: appID
    };
};

const ProofModal = ({ show, onHide, generateNewProof, proof }) => {
    if (!proof) {
        return null;
    }

    console.log(proof);

    return (
        <Modal show={show} onHide={() => onHide()}>
            <Modal.Header closeButton>
                <Modal.Title>Generate Humanity Proof</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div style={{ overflowWrap: "break-word" }}>
                    <p>
                        The following data can be used to prove that you control an account registered
                        in the ZK Pool of Humanity.
                    </p>
                    <p>
                        You can check by inputing this data into the checkHumanity function of the Pool of Humanity
                        smart contract on <a href="https://goerli.etherscan.io/address/0x3a10050acac8168ccbcef73bca084e427386fcc0#readContract" target="_blank">etherscan</a>.
                    </p>
                    <hr />
                    <p><b>Root:</b><br />{proof.root}</p>
                    <p><b>Current Time:</b><br />{proof.currentTime}</p>
                    <p><b>App ID:</b><br />{proof.appID}</p>
                    <p><b>App Nullifier:</b><br />{proof.appNullifier}</p>
                    <p><b>Proof:</b><br />{JSON.stringify(proof.flattenedProof).split('"').join('')}</p>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => onHide()}>
                    Close
                </Button>
                <Button variant="primary" onClick={() => generateNewProof()}>
                    Generate Another Proof
                </Button>
            </Modal.Footer>
        </Modal>);
}

const GenerateProofModal = ({ show, onHide, connector, keys, poolState, showProof }) => {
    const [appID, setAppID] = React.useState(0);
    const [proving, setProving] = React.useState(false);
    const updateAppID = (e) => {
        if (isNaN(e.target.value)) {
            return;
        }
        setAppID(e.target.value);
    }

    const doVerify = async () => {
        setProving(true);
        const proof = await verifyHumanity(connector, keys, poolState, appID);
        setProving(false);
        showProof(proof);
    }

    return (
        <Modal show={show} onHide={() => onHide()}>
            <Modal.Header closeButton>
                <Modal.Title>Generate Humanity Proof</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    App developers who integrate the ZK Pool of Humanity will provide an App ID that is
                    provided to the ZK Snark. The ZK Snark outputs an app nullifier that is unique to a single
                    user of this app. This ensures that a single user cannot create multiple accounts for
                    the same app.
                    <br />
                    <br />
                    The App ID must be a number.
                </p>
                <InputGroup className="mb-3" style={{ width: "50%" }}>
                    <InputGroup.Text>App ID</InputGroup.Text>
                    <Form.Control value={appID} onChange={updateAppID} />
                </InputGroup>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => onHide()}>
                    Close
                </Button>
                <Button variant="primary" onClick={() => doVerify()}>
                    Generate Proof of Humanity Snark Proof
                </Button>
                <Spinner hidden={!proving} animation="border" style={{ marginLeft: "5px" }} size="sm" />
            </Modal.Footer>
        </Modal>);
}

const SyncRegistrationButton = ({ registeredForPool, poolSubmission, proofOfHumanitySubmission, syncRegistration, keysGenerated }) => {
    if (!registeredForPool) {
        return null;
    }

    if (poolSubmission.registered === proofOfHumanitySubmission.registered &&
        Number(poolSubmission.submissionTime) === Number(proofOfHumanitySubmission.submissionTime)) {
        return null;
    }

    return (
        <Button disabled={!keysGenerated} style={{ marginTop: "10px" }} onClick={() => syncRegistration()}>
            Sync Registration
        </Button>
    )
}

const registerForPool = async (connector, keys) => {
    const provider = await connector.getProvider();
    const web3 = new Web3(provider);
    const pool = new web3.eth.Contract(PoolABI, process.env.GATSBY_POOL_CONTRACT);
    try {
        await pool.methods.register(keys.PublicKey).send({ from: keys.Account, value: depositAmount }, (err, res) => {
            if (err) {
                console.log(err);
            } else {
                console.log(res);
            }
        });
    } catch (e) {
        console.log(e);
    }
};

const RegisterForPoolButton = ({ keys, connector }) => {
    let [registering, setRegistering] = React.useState(false);

    const doRegister = async () => {
        setRegistering(true);
        await registerForPool(connector, keys);
        setRegistering(false);
    };

    return (
        <>
            <Button disabled={!keys} onClick={() => doRegister()}>Register for Pool of Humanity</Button>
            <Spinner hidden={!registering} animation="border" style={{ marginLeft: "5px" }} size="sm" />
        </>);
};

const RegistrationSection = ({
    registeredForProofOfHumanity,
    proofOfHumanitySubmission,
    registeredForPool,
    poolSubmission,
    keysGenerated,
    finishedFetchingState,
    submissionDuration,
    unregister,
    syncRegistration,
    connector,
    keys }) => {

    if (!finishedFetchingState) {
        return <div style={{ marginTop: "20px" }}>
            <p>
                Loading data...
            </p>
        </div>
    }

    if (!registeredForProofOfHumanity) {
        return (
            <div style={{ marginTop: "20px" }}>
                <p>
                    You are not registered for the Proof of Humanity. You can only register for the ZK Pool of Humanity if you
                    have a Proof of Humanity account that has completed vouching.
                </p>
                <Link style={{ textDecoration: "none" }} to="../testProof">
                    <Button>Register for Proof of Humanity</Button>
                </Link>
            </div>
        )
    }

    const proofSection = (
        <div>
            <p>
                <b>Proof of Humanity Registration:</b>
                <br />
                - Submission Date: {moment(Number(proofOfHumanitySubmission.submissionTime) * 1000).format("YYYY-MM-DD")}
                <br />
                - Expiration Date: {moment((Number(proofOfHumanitySubmission.submissionTime) + Number(submissionDuration)) * 1000).format("YYYY-MM-DD")}
                <br />
                - Status: {ProofOfHumanityStatusName(proofOfHumanitySubmission.status)}
                <br />
                - Registered: {proofOfHumanitySubmission.registered ? "true" : "false"}
            </p>
        </div>
    );

    let poolSection;

    if (!registeredForPool) {
        let notRegisteredSection;
        if (!proofOfHumanitySubmission.registered || Number(proofOfHumanitySubmission.status) !== 0) {
            notRegisteredSection = (
                <p>
                    Your Proof of Humanity registration must be finished vouching and not pending (None state) before you can register
                    for the ZK Pool of Humanity.
                </p>
            );
        } else {
            notRegisteredSection = <RegisterForPoolButton keys={keys} connector={connector} />;
        }

        poolSection = (
            <div>
                <p>
                    <b>You are not registered for the Pool of Humanity.</b>
                </p>
                {notRegisteredSection}
            </div>
        );
    } else {
        poolSection = (
            <p>
                <b>ZK Pool of Humanity Registration:</b>
                <br />
                - Submission Date: {moment(Number(proofOfHumanitySubmission.submissionTime) * 1000).format("YYYY-MM-DD")}
                <br />
                - Expiration Date: {moment((Number(poolSubmission.submissionTime) + Number(submissionDuration)) * 1000).format("YYYY-MM-DD")}
                <br />
                - Registered: {poolSubmission.registered ? "true" : "false"}
                <br />
                {poolSubmission.registered ? <><Button disabled={!keysGenerated} style={{ marginTop: "10px" }} onClick={() => unregister()}>Unregister</Button><br /></> : null}
                <SyncRegistrationButton
                    keysGenerated={keysGenerated}
                    registeredForPool={registeredForPool}
                    poolSubmission={poolSubmission}
                    proofOfHumanitySubmission={proofOfHumanitySubmission}
                    syncRegistration={syncRegistration}
                />
            </p>
        );
    }

    return (<Container style={{ marginTop: "20px" }}>
        <Row>
            <Col style={{ border: "solid" }}>
                {proofSection}
            </Col>
            <Col style={{ borderTop: "solid", borderRight: "solid", borderBottom: "solid" }}>
                {poolSection}
            </Col>
        </Row>
    </Container>);
};

const GenerateProofButton = ({ keysGenerated, onClick, canGenerateProofs }) => {
    if (!canGenerateProofs) {
        return null;
    }

    return (
        <Button style={{ marginTop: "15px" }} disabled={!keysGenerated} onClick={() => onClick()}>Generate Snark Proof</Button>
    );
}

const PoolAccountPage = () => {
    const [proof, setProof] = React.useState(null);
    const [showKeysModal, setShowKeysModal] = React.useState(false);
    const [showUnregisterModal, setShowUnregisterModal] = React.useState(false);
    const [showSyncRegistrationModal, setShowSyncRegistrationModal] = React.useState(false);
    const [showGenerateProofModal, setShowGenerateProofModal] = React.useState(false);
    const [showProofModal, setShowProofModal] = React.useState(false);

    React.useEffect(() => {
        // Add snarkjs script
        const script = document.createElement('script');
        script.src = "/snarkjs.min.js";
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        }
    }, []);

    const { active, account, connector } = useWeb3React();
    const contractsState = useContext(ContractsContext);
    const { ProofOfHumanityState, PoolState, Keys } = contractsState;

    if (!active || !contractsState.FinishedFetchingState) {
        return layout(<Loading walletConnected={active} finishedFetchingData={contractsState.FinishedFetchingState} />);
    }

    const updateKeys = async () => {
        const provider = await connector.getProvider();
        const web3 = new Web3(provider);
        const hash = web3.utils.sha3("poolofhumanity");
        const signature = await web3.eth.sign(hash, account);
        const privateKey = web3.utils.sha3(signature);
        const poseidon = await buildPoseidon();
        const publicKey = poseidonHash(poseidon, [privateKey]);
        contractsState.UpdateKeys(privateKey, publicKey, account);
    };

    let registeredForProofOfHumanity = false;
    let proofOfHumanitySubmission = null;
    let registeredForPool = false;
    let poolSubmission = null;

    if (contractsState.FinishedFetchingState) {
        for (let i = 0; i < ProofOfHumanityState.length; i++) {
            if (ProofOfHumanityState[i].address === account) {
                registeredForProofOfHumanity = true;
                proofOfHumanitySubmission = ProofOfHumanityState[i];
            }
        }

        if (registeredForProofOfHumanity) {
            const poolUserInfo = PoolState.addressToIndex.get(account);
            if (poolUserInfo) {
                registeredForPool = true;
                poolSubmission = poolUserInfo;
            }
        }
    }

    return layout(
        <div>
            <SyncRegistrationModal
                show={showSyncRegistrationModal}
                onHide={() => setShowSyncRegistrationModal(false)}
                syncRegistration={() => updatePoolEntry(connector, PoolState, Keys, proofOfHumanitySubmission.submissionTime, proofOfHumanitySubmission.registered)}
            />
            <UnregisterModal
                show={showUnregisterModal}
                onHide={() => setShowUnregisterModal(false)}
                unregister={() => unregister(connector, PoolState, Keys)}
            />
            <GenerateKeysModal
                show={showKeysModal}
                onHide={() => setShowKeysModal(false)}
                updateKeys={() => { updateKeys() }}
            />
            <GenerateProofModal
                show={showGenerateProofModal}
                onHide={() => setShowGenerateProofModal(false)}
                connector={connector}
                keys={contractsState.Keys}
                poolState={PoolState}
                showProof={(proof) => {
                    setProof(proof);
                    setShowGenerateProofModal(false);
                    setShowProofModal(true);
                }}
            />
            <ProofModal
                show={showProofModal}
                onHide={() => setShowProofModal(false)}
                generateNewProof={() => {
                    setShowProofModal(false);
                    setShowGenerateProofModal(true)
                }}
                proof={proof}
            />

            <GenerateKeysButton keys={contractsState.Keys} onClick={() => setShowKeysModal(true)} />
            <RegistrationSection
                finishedFetchingState={contractsState.FinishedFetchingState}
                registeredForProofOfHumanity={registeredForProofOfHumanity}
                proofOfHumanitySubmission={proofOfHumanitySubmission}
                registeredForPool={registeredForPool}
                poolSubmission={poolSubmission}
                keysGenerated={!!contractsState.Keys}
                submissionDuration={contractsState.SubmissionDuration}
                registerForPool={() => registerForPool(connector, contractsState.Keys)}
                unregister={() => setShowUnregisterModal(true)}
                syncRegistration={() => setShowSyncRegistrationModal(true)}
                connector={connector}
                keys={contractsState.Keys}
            />
            <GenerateProofButton
                canGenerateProofs={registeredForPool && poolSubmission.registered}
                keysGenerated={!!contractsState.Keys}
                onClick={() => setShowGenerateProofModal(true)}
            />
        </div>);
}

export default PoolAccountPage;