/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/ssr-apis/
**/
import React from "react";
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from "@ethersproject/providers";

function getLibrary(provider) {
  return new Web3Provider(provider);
}

export const wrapRootElement = ({ element }) => {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
        {element}
    </Web3ReactProvider>
  )
}