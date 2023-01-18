import * as React from 'react';
import Header from './Header';
import { PoolState } from '../utils/poolState';
import { buildPoseidon } from 'circomlibjs';
import { useWeb3React } from "@web3-react/core";
import Web3 from "web3";
import PoolABI from "../utils/abi/PoolOfHumanity.json";
import TestPOHABI from "../utils/abi/TestPOH.json";
import { useState, createContext } from "react";
import { Contract, providers as ethersProviders } from 'ethers';

export const ContractsContext = createContext({
    PoolState: null,
    ProofOfHumanityState: null,
    StartedFetchingState: false,
    FinishedFetchingState: false,
    SubscribedToEvents: false,
    Keys: null,
    UpdateKeys: () => {},
});

async function getProofOfHumanitySubmissionDuration(web3) {
    const testPOH = new web3.eth.Contract(TestPOHABI, process.env.GATSBY_POH_CONTRACT)
    return await testPOH.methods.submissionDuration().call();
}

async function getProofOfHumanitySubmissions(web3) {
    const testPOH = new web3.eth.Contract(TestPOHABI, process.env.GATSBY_POH_CONTRACT)
    const numSubmissions = await testPOH.methods.numSubmissions().call();
    const submissions = [];
    for (let i = 0; i < numSubmissions; i++) {
        const address = await testPOH.methods.submissionsList(i).call();
        const submission = await testPOH.methods.getSubmissionInfo(address).call();
        submission.address = address;
        submissions.push(submission);
    }
    return submissions
}

async function getPoolState(web3) {
    const poolOfHumanity = new web3.eth.Contract(PoolABI, process.env.GATSBY_POOL_CONTRACT)
    const events = await poolOfHumanity.getPastEvents("allEvents", { fromBlock: 1});
    const poseidon = await buildPoseidon();
    const poolState = new PoolState(poseidon);
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.event === "Registered") {
            await poolState.register(event.returnValues.user, event.returnValues.index, event.returnValues.pubKey, event.returnValues.submissionTime);
        } else if (event.event === "Updated") {
            await poolState.update(event.returnValues.user, event.returnValues.submissionTime, event.returnValues.registered);
        }
    }

    return poolState;
}

async function getState(connector, setState) {
    try {
        const provider = await connector.getProvider()
        const web3 = new Web3(provider);
        const submissions = await getProofOfHumanitySubmissions(web3);
        const poolState = await getPoolState(web3);
        const submissionDuration = await getProofOfHumanitySubmissionDuration(web3);
        setState(prevState => {
            return {
            ...prevState,
            PoolState: poolState,
            ProofOfHumanityState: submissions,
            FinishedFetchingState: true,
            SubmissionDuration: submissionDuration
        }});
    } catch (err) {
        console.log(err);
        setState(prevState => {
            return {
            ...prevState,
            StartedFetchingState: false
        }});
    }
}

export default function Layout({children}) {
    const [state, setState] = useState({
        PoolState: null,
        ProofOfHumanityState: null,
        StartedFetchingState: false,
        FinishedFetchingState: false,
        SubscribedToEvents: false,
        SubmissionDuration: null,
        Keys: null,
        forceUpdate: false,
        UpdateKeys: (privateKey, publicKey, account) => {
            setState(prevState => {
                return {
                    ...prevState,
                    Keys: {
                        Account: account,
                        PrivateKey: privateKey,
                        PublicKey: publicKey
                    }
                }
            });
        }
    });

    const { active, account, connector } = useWeb3React();

    if (active && account && state && state.Keys && state.Keys.Account !== account) {
        setState({
            ...state,
            Keys: null
        });
    }

    if (connector) {
        if (!state.StartedFetchingState) {
            setState(prevState => {
                return {
                ...prevState,
                StartedFetchingState: true,
            }});
            getState(connector, setState);
        }

        if (!state.SubscribedToEvents) {
            connector.getProvider().then((provider) => {
                const poolOfHumanity = new Contract(process.env.GATSBY_POOL_CONTRACT, PoolABI, new ethersProviders.Web3Provider(provider));
                poolOfHumanity.on('Registered', (address, index, pubKey, submissionTime) => {
                    setState(prevState => {
                        const poolState = prevState.PoolState;
                        if (!poolState) {
                            return prevState;
                        }
                        poolState.register(address, index, pubKey, submissionTime.toNumber());
                        return {
                            ...prevState,
                            forceUpdate: !prevState.forceUpdate
                        };
                    })
                });
                poolOfHumanity.on('Updated', (address, submissionTime, registered) => {
                    setState(prevState => {
                        const poolState = prevState.PoolState;
                        if (!poolState) {
                            return prevState;
                        }
                        poolState.update(address, submissionTime.toNumber(), registered);
                        return {
                            ...prevState,
                            forceUpdate: !prevState.forceUpdate
                        };
                    })
                });

                const testPOH = new Contract(process.env.GATSBY_POH_CONTRACT, TestPOHABI, new ethersProviders.Web3Provider(provider));
                testPOH.on('SubmissionUpdated', (address, status, registered, time) => {
                    setState(prevState => {
                        const submissions = prevState.ProofOfHumanityState;
                        if (!submissions) {
                            return prevState;
                        }
                        const submission = submissions.find(submission => submission.address === address);
                        if (!submission) {
                            submissions.push({
                                address: address, 
                                status: status,
                                registered: registered, 
                                submissionTime: time.toNumber()
                            });
                        } else {
                            submission.status = status;
                            submission.registered = registered;
                            submission.submissionTime = time.toNumber();
                        }
                        return {
                            ...prevState,
                            ProofOfHumanityState: submissions,
                        }
                    })
                });    
            });
            setState({
                ...state,
                SubscribedToEvents: true,
            });

        }
    }

    return (
        <ContractsContext.Provider value={state}>
            <main>
                <Header />
                {children}
            </main>
        </ContractsContext.Provider>
    );
}