import * as React from 'react';
import { Spinner } from 'react-bootstrap';

const Loading = ({walletConnected, finishedFetchingData}) => {
    if (!walletConnected) {
        return (
            <h5>Please connect your wallet!</h5>
        );
    }

    if (!finishedFetchingData) {
        return (
            <>
                <h5>Loading Data...</h5>
                <Spinner animation="border" size="sm"/>
            </>
        );
    }

    return null;
}

export default Loading;