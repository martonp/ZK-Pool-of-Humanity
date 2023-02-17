const fs = require("fs");

const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/
const verifierRegex = /contract PlonkVerifier/

let content = fs.readFileSync("./contracts/HumanityVerifier.sol", { encoding: 'utf-8' });
let bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0');
let renamed = bumped.replace(verifierRegex, 'contract HumanityVerifier')
fs.writeFileSync("./contracts/HumanityVerifier.sol", renamed);

content = fs.readFileSync("./contracts/UpdateVerifier.sol", { encoding: 'utf-8' });
bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0');
renamed = bumped.replace(verifierRegex, 'contract UpdateVerifier')
fs.writeFileSync("./contracts/UpdateVerifier.sol", renamed);