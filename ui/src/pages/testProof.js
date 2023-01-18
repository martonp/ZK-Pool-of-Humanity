import * as React from "react"
import { useWeb3React } from "@web3-react/core";
import Web3 from "web3";
import TestPOHABI from "../utils/abi/TestPOH.json";
import { Container, Modal, Form, Spinner, Table, Button } from "react-bootstrap";
import { useContext } from 'react'
import { ContractsContext } from '../components/layout'
import Loading from "../components/Loading";
import { ProofOfHumanityStatusName } from "../utils/utils";

const POHSubmissions = ({ submissions, updater }) => {
    return (
        <Table>
            <thead>
                <tr>
                    <th>Address</th>
                    <th>Submission Time</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Update</th>
                </tr>
            </thead>
            <tbody>
                {submissions.map((submission, i) => {
                    return (
                        <tr key={i}>
                            <td>{submission.address}</td>
                            <td>{submission.submissionTime}</td>
                            <td>{ProofOfHumanityStatusName(submission.status)}</td>
                            <td>{submission.registered ? "True" : "False"}</td>
                            <td><Button onClick={() => updater(submission)}>Update</Button></td>
                        </tr>
                    )
                })}
            </tbody>
        </Table>
    );
}

const layout = (contents) => {
    return (
        <Container style={{ marginTop: "20px", width: "60%" }}>
            {contents}
        </Container>);
};

const TestProof = () => {
    const { active, account, connector } = useWeb3React();
    const contractsState = useContext(ContractsContext);

    const [updating, setUpdating] = React.useState(false);
    const [show, setShow] = React.useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [formState, setFormState] = React.useState({
        address: "",
        submissionTime: "",
        status: 0,
        registered: false,
    })

    if (!active || !contractsState.FinishedFetchingState) {
        return layout(<Loading walletConnected={active} finishedFetchingData={contractsState.FinishedFetchingState} />);
    }

    const updateAddress = (e) => {
        setFormState({
            ...formState,
            address: e.target.value,
        })
    }

    const updateSubmissionTime = (e) => {
        if (isNaN(e.target.value)) {
            return
        }
        setFormState({
            ...formState,
            submissionTime: e.target.value,
        })
    }

    const updateStatus = (e) => {
        setFormState({
            ...formState,
            status: e.target.value,
        })
    }

    const updateRegistered = (e) => {
        setFormState({
            ...formState,
            registered: e.target.checked,
        })
    }

    const updatePOHEntry = (e) => {
        e.preventDefault();

        if (connector && active) {
            connector.getProvider().then(
                async (provider) => {
                    setUpdating(true);

                    try {
                        const web3 = new Web3(provider);
                        const testPOH = new web3.eth.Contract(TestPOHABI, process.env.GATSBY_POH_CONTRACT)
                        await testPOH.methods.updateSubmission(formState.address, formState.status, formState.registered, formState.submissionTime).send({ from: account }, (err, res) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(res);
                            }
                        });
                    } catch (err) {
                        console.log(err);
                    }

                    setUpdating(false);
                    handleClose();
                });
        }
    }

    const updateAndShowModal = (values) => {
        setFormState(values);
        handleShow();
    };

    const openBlankModal = () => {
        setFormState({
            address: "",
            submissionTime: "",
            status: 0,
            registered: false,
        })
        handleShow();
    }

    const instructions = (
        <p>
            This page is used to manage the Test Proof of Humanity contract. The ZK Pool of Humanity
            contract uses the <mark style={{ backroundColor: "grey" }}>getSubmissionInfo(address)</mark>
            function from Proof of Humanity, so this test contract only contains this function. The values
            for any submission in this contract can be modified by anyone.
        </p>
    );


    if (!connector || !active) {
        return (
            <Container style={{ width: "60%", marginTop: "20px" }}>
                {instructions}
                <h5>Please connect your wallet!</h5>
            </Container>
        )
    }

    return (
        <div>
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Update Proof of Humanity Registry</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        If an address is already in the registry, it's information will be updated.
                        If it is not in the registry, it will be added.
                    </p>
                    <Form.Group className="mb-3">
                        <Form.Label>Address</Form.Label>
                        <Form.Control value={formState.address} onChange={updateAddress} name="address" type="text" placeholder="Enter address" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Submission Time</Form.Label>
                        <Form.Control value={formState.submissionTime} onChange={updateSubmissionTime} name="submissionTime" type="text" placeholder="Enter submission time" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select
                            name="status"
                            value={formState.status}
                            onChange={updateStatus}>
                            <option value="0">None</option>
                            <option value="1">Vouching</option>
                            <option value="2">Pending Registration</option>
                            <option value="3">Pending Removal</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Registered</Form.Label>
                        <Form.Check
                            checked={formState.registered}
                            onChange={updateRegistered}
                            type="checkbox"
                            name="registered"
                        />
                    </Form.Group>
                    <Button onClick={updatePOHEntry}>Update Human</Button>
                    <Spinner animation="border" hidden={!updating} style={{ marginLeft: "5px" }} size="sm" />
                </Modal.Body>
            </Modal>

            <Container style={{ width: "60%", marginTop: "20px" }}>
                {instructions}
                <Button onClick={openBlankModal}>Add Submission</Button>
                {!contractsState.FinishedFetchingState ?
                    <h5>Loading registry...</h5> :
                    <POHSubmissions submissions={contractsState.ProofOfHumanityState} updater={updateAndShowModal} />}
            </Container>
        </div>
    )
};

export default TestProof;