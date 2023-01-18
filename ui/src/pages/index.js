import { navigate } from "gatsby";
import * as React from "react";
import Container from 'react-bootstrap/Container';

const Home = () => {

    const navigateToTestProof = (e) => {
        e.preventDefault();
        navigate("/testProof")
    }

    const navigateToGenProofs = (e) => {
        e.preventDefault();
        navigate("/genProofs")
    }

    const navigateToManagePool = (e) => {
        e.preventDefault();
        navigate("/managePool")
    }

    return (<Container style={{ marginTop: "20px", width: "50%" }}>
        <h1>ZK Pool of Humanity</h1>
        <p>
            The ZK Pool of Humanity is an extension to Proof of Humanity that enables users to prove they have a Proof of
            Humanity account without revealing their identity. Users with a fully registered Proof of Humanity account can
            add themselves to a shielded pool of users (similar to how Z-Cash maintains shielded pools of money), and then
            they can produce ZK Snark Proofs that prove they control one of those accounts.
        </p>
        <p>
            Users are required to post a small deposit when registering, incentivizing people to remove accounts from the pool
            that were challenged and deemed to be invalid in Proof of Humanity.
        </p>
        <p>
            Applications that integrate the ZK Pool of Humanity can require an AppID to be included as input in the ZK Snark Proof.
            The ZK Snark Proof will then output an "App Nullifier". A valid ZK Snark Proof for the same user and same app ID will
            always result in the same "App Nullifier", so this allows applications to have user accounts for unique real humans,
            without revealing anything about their identity.
        </p>
        <p>
            Technical details about how the ZK Pool of Humanity works can be found <a href="https://github.com/martonp/ZK-Pool-of-Humanity" target="_blank">here</a>.
        </p>
        <p>
            This application is still a proof of concept and is not intended for production use. It is deployed on testnet, and
            communicates with a Proof of Humanity contract who's data can be edited by anyone. Entries to the
            test Proof of Humanity contract can be added/updated <a href="" onClick={navigateToTestProof}>here</a>.
        </p>
        <p>
            Once your account is added to the test Proof of Humanity contract, you can add yourself to the
            ZK Pool of Humanity and sign proofs here <a href="" onClick={navigateToGenProofs}>here</a>.
        </p>
        <p>
            Click <a onClick={navigateToManagePool} href="">here</a> to check if there are any registrations in the ZK Pool of Humanity that have
            had their Proof of Humanity accounts revoked, and claim their deposit by removing them from the pool.
        </p>
    </Container>)

};

export default Home;

export const Head = () => {
    return (
        <title>ZK Pool of Humanity</title>
    );
}