const axios = require('axios');

const NETWORK = process.env.NETWORK
const URL_DJANGO = process.env.URL_DJANGO
const VAULT_BTC = process.env.VAULT_BTC
const VAULT_NEAR = process.env.VAULT_NEAR
const VAULT_ETH = process.env.VAULT_ETH
const VAULT_USDT = process.env.VAULT_USDT
const VAULT_USDC = process.env.VAULT_USDC
const VAULT_DAI = process.env.VAULT_DAI

function CONFIG (keyStores) {
  switch (NETWORK) {
    case 'mainnet':
      return {
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        keyStore: keyStores,
        walletUrl: 'https://wallet.near.org',
        helperUrl: 'https://helper.mainnet.near.org',
        explorerUrl: 'https://explorer.mainnet.near.org'
      }
    case 'testnet':
      return {
        networkId: 'testnet',
        keyStore: keyStores,
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://wallet.testnet.near.org',
        helperUrl: 'https://helper.testnet.near.org',
        explorerUrl: 'https://explorer.testnet.near.org'
      }
    default:
      throw new Error(`Unconfigured environment '${NETWORK}'`)
  }
}

async function GET_COMISION(coin) { 
  try {
      const url = URL_DJANGO + "api/v1/get-comision/" + coin
      const result = axios.get(url)
          .then(function (response) {
              return response.data
          })
          .catch(function (xhr) {
              return false
          });
      return result
  } catch (error) {
      return false
  }
}

function ADDRESS_VAULT (coin) {
  switch (coin) {
    case 'BTC':
      return VAULT_BTC
    case 'NEAR':
      return VAULT_NEAR
    case 'ETH':
      return VAULT_ETH
    case 'USDT':
      return VAULT_USDT
    case 'USDC':
      return VAULT_USDC
    case 'DAI':
      return VAULT_DAI        
    default:
      throw new Error(`Unconfigured environment '${coin}'`)
  }
}

module.exports = { CONFIG, GET_COMISION, ADDRESS_VAULT }