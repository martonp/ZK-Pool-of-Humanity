// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

enum Status {
    None,
    Vouching,
    PendingRegistration,
    PendingRemoval
}

struct Humanity {
    address owner;
    uint64 expirationTime;
    bool vouching;
    bool pendingRevocation;
}

/**
 *  @title TestPOH
 *  This contract is a test version of the Proof of Humanity contract.
 *  It exposes the getSubmissionInfo function, which is used by the Pool of Humanity contract.
 */
contract TestPOH {
    event HumanityUpdated(
        bytes20 indexed humanityID,
        address owner,
        uint64 expirationTime,
        bool vouching,
        bool pendingRevocation);

    mapping (bytes20 => Humanity) humanityMapping;
    bytes20[] public humanityList;

    function updateSubmission(
        bytes20 _humanityID,
        address _owner,
        bool _vouching,
        bool _pendingRevocation,
        uint64 _expirationTime) external {
        require(_expirationTime > 0, "Expiration time must be greater than 0");
        if (humanityMapping[_humanityID].expirationTime == 0) {
            humanityList.push(_humanityID);
        }
        humanityMapping[_humanityID] = Humanity( _owner, _expirationTime, _vouching, _pendingRevocation);
        emit HumanityUpdated(_humanityID, _owner, _expirationTime, _vouching, _pendingRevocation);
    }

    function numSubmissions() external view returns (uint) {
        return humanityList.length;
    }

    function getHumanityInfo(bytes20 _humanityId)
        external
        view
        returns (
            bool vouching,
            bool pendingRevocation,
            uint64 nbPendingRequests,
            uint64 expirationTime,
            address owner,
            uint256 nbRequests
        )
    {
        Humanity storage humanity = humanityMapping[_humanityId];
        return (
            humanity.vouching,
            humanity.pendingRevocation,
            0,
            humanity.expirationTime,
            humanity.owner,
            0
        );
    }

}
