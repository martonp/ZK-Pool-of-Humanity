import * as React from "react";
import { Container, Navbar, Nav, Button } from "react-bootstrap";
import { Link } from "gatsby";
import { useWeb3React } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";

const injected = new InjectedConnector({
    supportedChainIds: [5, 31337],
});

const ConnectWalletButton = () => {
    const { active, account, activate, deactivate } = useWeb3React();
    const onClick = () => {
        if (active) {
            deactivate()
        } else {
            activate(injected, (err) => {
                if(err.name === "UnsupportedChainIdError") {
                    console.log("UnsupportedChainIdError")
                    alert("Please connect to the Goerli Test Network")
                }
            })
        }
    }

    return (
        <Button onClick={onClick}>
            {active ? `Connected: ${account}` : 'Connect Wallet'}
        </Button>
    )
}

const Header = () => {
    return (
        <header>
            <Navbar bg="light" expand="lg">
            <Container>
                <Link style={{textDecoration: "none"}} className="link-no-style" to="../"><Navbar.Brand>ZK Pool of Humanity</Navbar.Brand></Link>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="me-auto">
                    <Link style={{textDecoration: "none"}} className="link-no-style" to="../genProofs">
                        <Nav.Link as="span" eventKey="genProofs">Pool Account</Nav.Link>
                    </Link>
                    <Link style={{textDecoration: "none"}} className="link-no-style" to="../managePool">
                        <Nav.Link as="span" eventKey="managePool">Manage Pool</Nav.Link>
                    </Link>
                    <Link style={{textDecoration: "none"}} className="link-no-style" to="../testProof">
                        <Nav.Link as="span" eventKey="testProof">Test Proof of Humanity</Nav.Link>
                    </Link>
                </Nav>
                </Navbar.Collapse>
                <ConnectWalletButton />
            </Container>
            </Navbar>
        </header>
    );
}

export default Header;
