const NETWORK = process.env.NETWORK

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

module.exports = { CONFIG }