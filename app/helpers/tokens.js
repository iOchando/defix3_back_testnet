const NETWORK = process.env.NETWORK

function TOKENS () {
    switch (NETWORK) {
      case 'mainnet':
        return [
            {
                decimals: 18,
                symbol: "ETH",
                address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            },
            {
                decimals: 18,
                symbol: "DAI",
                address: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
            },
            {
                decimals: 6,
                symbol: "USDC",
                address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            },
            {
                decimals: 6,
                symbol: "USDT",
                address: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            },
        ]
      case 'testnet':
        return [
            {
                decimals: 18,
                symbol: "ETH",
                address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            },
            {
                decimals: 18,
                symbol: "DAI",
                address: "0xaD6D458402F60fD3Bd25163575031ACDce07538D"
            },
            {
                decimals: 18,
                symbol: "USDC",
                address: "0x7b2810576aa1cce68f2b118cef1f36467c648f92"
            },
            {
                decimals: 18,
                symbol: "USDT",
                address: "0x21718C0FbD10900565fa57C76e1862cd3F6a4d8E"
            },
        ]
      default:
        throw new Error(`Unconfigured environment '${NETWORK}'`)
    }
  }
  
  module.exports = { TOKENS }