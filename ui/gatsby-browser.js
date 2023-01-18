/**
 * Implement Gatsby's Browser APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/browser-apis/
**/
import React from "react";
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from "@ethersproject/providers";
import "bootstrap/dist/css/bootstrap.min.css";
import 'bootstrap/dist/js/bootstrap.min.js';
import Layout from './src/components/layout';

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

export const wrapPageElement = ({ element }) => {
  return (
      <Layout>
      {element}
      </Layout>
  )
}