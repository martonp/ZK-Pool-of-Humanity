import * as React from "react";
import { useContext } from 'react';
import { useWeb3React } from "@web3-react/core";
import { ContractsContext } from '../components/layout';
import { Button, Container, Table, Spinner } from 'react-bootstrap';
import { GetUpdateInputs } from "../utils/utils";
import Web3 from "web3";
import PoolABI from "../utils/abi/PoolOfHumanity.json";
import Loading from "../components/Loading";

const layout = (contents) => {
    return (
        <Container style={{ marginTop: "20px", width: "60%" }}>
            {contents}
        </Container>);
};

const registrationsThatNeedCancellation = (poolOfHumanityState, proofOfHumanityState) => {
    let registration = [];

    for (let i = 0; i < proofOfHumanityState.length; i++) {
        const proofRegistration = proofOfHumanityState[i];
        const poolRegistration = poolOfHumanityState.userInfo(proofRegistration.address);

        if (!poolRegistration) continue;

        if (!proofRegistration.registered && poolRegistration.registered) {
            registration.push(proofRegistration);
        }
    }

    return registration;
}

const CancelRegistrationsTable = ({ proofOfHumanityRegistrations, cancelRegistration }) => {
    const [cancelling, setCancelling] = React.useState(null);

    if (proofOfHumanityRegistrations.length === 0) {
        return <b>There are currently no registrations that can be revoked.</b>
    }

    const doCancel = async (proofOfHumanityRegistration) => {
        console.log("Cancelling registration for " + proofOfHumanityRegistration.address);
        setCancelling(proofOfHumanityRegistration.address);
        await cancelRegistration(proofOfHumanityRegistration);
        setCancelling(null);
    }

    return (
        <Table>
            <thead>
                <tr>
                    <th>Address</th>
                    <th>Cancel</th>
                </tr>
            </thead>
            <tbody>
                {proofOfHumanityRegistrations.map((reg, i) => {
                    const registration = reg;
                    console.log(cancelling);
                    console.log(registration.address);
                    return (
                        <tr key={i}>
                            <td>{registration.address}</td>
                            <td>
                                <Button onClick={() => doCancel(registration)}>Cancel</Button>
                                <Spinner animation="border" style={{ marginLeft: "5px" }} size="sm" hidden={cancelling !== registration.address} />
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </Table>
    );
}

const ManagePool = () => {

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
    const { ProofOfHumanityState, PoolState, FinishedFetchingState } = contractsState;

    if (!active || !FinishedFetchingState) {
        return layout(<Loading walletConnected={active} finishedFetchingData={FinishedFetchingState} />);
    }

    const cancelRegistration = async (proofOfHumanityRegistration) => {
        const poolRegistration = PoolState.userInfo(proofOfHumanityRegistration.address);
        if (!poolRegistration) {
            console.error("Pool registration not found!");
            return;
        }
        const { solProof, updatedPath, currSubmissionTime, currRegistered, currPath } =
            await GetUpdateInputs(PoolState, 0, false, poolRegistration.pubKey, proofOfHumanityRegistration.address);

        const provider = await connector.getProvider();
        const web3 = new Web3(provider);
        const pool = new web3.eth.Contract(PoolABI, process.env.GATSBY_POOL_CONTRACT);
        try {
            await pool.methods.updateSubmission(proofOfHumanityRegistration.address, currSubmissionTime, currRegistered ? 1 : 0,
                currPath, updatedPath, solProof.a, solProof.b, solProof.c).send({ from: account }, (err, res) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(res);
                    }
                });
        } catch (err) {
            console.log(err);
        }
    }

    return layout(
        <>
            <p>
                This page is used to revoke the registrations of people who have a Proof of Humanity account that has been challenged
                and deemed invalid. If you revoke someone's registration, you will be able to claim their <b>0.05 ETH</b> deposit.
            </p>
            <CancelRegistrationsTable
                proofOfHumanityRegistrations={registrationsThatNeedCancellation(PoolState, ProofOfHumanityState)}
                cancelRegistration={cancelRegistration}
            />
        </>
    );
}

export default ManagePool;