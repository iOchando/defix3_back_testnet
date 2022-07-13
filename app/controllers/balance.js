const nearAPI = require("near-api-js");
const axios = require('axios');
const { dbConnect } = require('../../config/postgres')
const { CONFIG } = require('../helpers/utils')
const { TOKENS } = require('../helpers/tokens')
const ethers = require('ethers');
const Web3 = require('web3');

const { ParaSwap } = require('paraswap');
const { response } = require('express');

const { Contract, keyStores, KeyPair , Near, Account, utils} = nearAPI;

const CONTRACT_NAME = process.env.CONTRACT_NAME;
const SIGNER_ID = process.env.SIGNER_ID;
const SIGNER_PRIVATEKEY = process.env.SIGNER_PRIVATEKEY;

const NETWORK = process.env.NETWORK
const NETWORK_PARASWAP = process.env.NETWORK_PARASWAP

const ETHERSCAN = process.env.ETHERSCAN

ETHEREUM_NETWORK = process.env.ETHEREUM_NETWORK
INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID

const web3 = new Web3(
    new Web3.providers.HttpProvider(
      `https://${ETHEREUM_NETWORK}.infura.io/v3/${INFURA_PROJECT_ID}`
    )
  );

const tokens = TOKENS()

const getBalance = async (req, res) => {
    try {
        const { defixId } = req.body

        let account = await getUserDefix(defixId)

        if (account) {
            let allBalances = []
            var addressbtc
            var addresseth

            for (var i = 0; i < account.addresses.length; i++) {
                if (account.addresses[i].name === "BTC") {
                    addressbtc = account.addresses[i].address
                }
                if (account.addresses[i].name === "ETH") {
                    addresseth = account.addresses[i].address
                }
            }

            const balanceBTC = await getBalanceBTC(addressbtc)//BTC
            allBalances.push(balanceBTC)

            const balanceETH = await getBalanceTokenETH(addresseth, "ETH")//ETH
            allBalances.push(balanceETH)

            const balanceUSDT = await getBalanceToken(addresseth, "USDT")//USDT
            allBalances.push(balanceUSDT)

            const balanceUSDC = await getBalanceToken(addresseth, "USDC")//USDC
            allBalances.push(balanceUSDC)

            const balanceDAI = await getBalanceToken(addresseth, "DAI")//DAI
            allBalances.push(balanceDAI)
            
            const balanceNEAR = await getBalanceNEAR(account.near_id)
            allBalances.push(balanceNEAR)

            const conexion = await dbConnect()

            const resultado = await conexion.query("select * \
                                                from balance where \
                                                defix_id = $1\
                                                ", [defixId])


            if (resultado.rows[0]) {
                const result = await conexion.query("update balance\
                                set btc = $1, eth = $2, near = $3, usdt = $4, usdc = $5, dai = $6 where\
                                defix_id = $7\
                                ", [balanceBTC.balance, balanceETH.balance, balanceNEAR.balance, balanceUSDT.balance, balanceUSDC.balance, balanceDAI.balance, defixId])
                    .then(() => {
                        return true
                    }).catch((error) => {
                        return  false
                    })


                if (result === true) {
                    res.json(allBalances)
                } else {
                    res.status(500).json()
                }
            } else {
                const result = await conexion.query(`insert into balance
                                (defix_id, btc, eth, near, usdt, usdc, dai)
                                values ($1, $2, $3, $4, $5, $6, $7)`, [defixId, balanceBTC.balance, balanceETH.balance, balanceNEAR.balance, balanceUSDT.balance, balanceUSDC.balance, balanceDAI.balance])
                    .then(() => {
                        return true
                    }).catch(() => {
                        return false
                    })
                if (result === true) {
                    res.json(allBalances)
                } else {
                    res.status(204).json()
                }
            }
        } else {
            res.status(201).json()
        }
        
    } catch (error) {
        res.status(404).json()
    }
}

async function getBalanceToken(address, coin) { 
    try {
        const minABI = [
            {
                constant: true,
                inputs: [],
                name: "name",
                outputs: [
                    {
                        name: "",
                        type: "string"
                    }
                ],
                payable: false,
                stateMutability: "view",
                type: "function"
            },
            {
                constant: false,
                inputs: [
                    {
                        name: "_spender",
                        type: "address"
                    },
                    {
                        name: "_value",
                        type: "uint256"
                    }
                ],
                name: "approve",
                outputs: [
                    {
                        name: "",
                        type: "bool"
                    }
                ],
                payable: false,
                stateMutability: "nonpayable",
                type: "function"
            },
            {
                constant: true,
                inputs: [],
                name: "totalSupply",
                outputs: [
                    {
                        name: "",
                        type: "uint256"
                    }
                ],
                payable: false,
                stateMutability: "view",
                type: "function"
            },
            {
                constant: false,
                inputs: [
                    {
                        name: "_from",
                        type: "address"
                    },
                    {
                        name: "_to",
                        type: "address"
                    },
                    {
                        name: "_value",
                        type: "uint256"
                    }
                ],
                name: "transferFrom",
                outputs: [
                    {
                        name: "",
                        type: "bool"
                    }
                ],
                payable: false,
                stateMutability: "nonpayable",
                type: "function"
            },
            {
                constant: true,
                inputs: [],
                name: "decimals",
                outputs: [
                    {
                        name: "",
                        type: "uint8"
                    }
                ],
                payable: false,
                stateMutability: "view",
                type: "function"
            },
            {
                constant: true,
                inputs: [
                    {
                        name: "_owner",
                        type: "address"
                    }
                ],
                name: "balanceOf",
                outputs: [
                    {
                        name: "balance",
                        type: "uint256"
                    }
                ],
                payable: false,
                stateMutability: "view",
                type: "function"
            },
            {
                constant: true,
                inputs: [],
                name: "symbol",
                outputs: [
                    {
                        name: "",
                        type: "string"
                    }
                ],
                payable: false,
                stateMutability: "view",
                type: "function"
            },
            {
                constant: false,
                inputs: [
                    {
                        name: "_to",
                        type: "address"
                    },
                    {
                        name: "_value",
                        type: "uint256"
                    }
                ],
                name: "transfer",
                outputs: [
                    {
                        name: "",
                        type: "bool"
                    }
                ],
                payable: false,
                stateMutability: "nonpayable",
                type: "function"
            },
            {
                constant: true,
                inputs: [
                    {
                        name: "_owner",
                        type: "address"
                    },
                    {
                        name: "_spender",
                        type: "address"
                    }
                ],
                name: "allowance",
                outputs: [
                    {
                        name: "",
                        type: "uint256"
                    }
                ],
                payable: false,
                stateMutability: "view",
                type: "function"
            },
            {
                payable: true,
                stateMutability: "payable",
                type: "fallback"
            },
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        name: "owner",
                        type: "address"
                    },
                    {
                        indexed: true,
                        name: "spender",
                        type: "address"
                    },
                    {
                        indexed: false,
                        name: "value",
                        type: "uint256"
                    }
                ],
                name: "Approval",
                type: "event"
            },
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        name: "from",
                        type: "address"
                    },
                    {
                        indexed: true,
                        name: "to",
                        type: "address"
                    },
                    {
                        indexed: false,
                        name: "value",
                        type: "uint256"
                    }
                ],
                name: "Transfer",
                type: "event"
            }
        ]

        var srcToken
        var decimals
      
  
        for(var i = 0; i < tokens.length; i++) {
            if(tokens[i].symbol === coin) {
                srcToken = tokens[i].address
                decimals = tokens[i].decimals
            }
        }
        let contract = new web3.eth.Contract(minABI,srcToken);
        const balance = await contract.methods.balanceOf(address).call();

        let item = {}
        if (balance) {
            let value = Math.pow(10, decimals)
            item.coin = coin
            item.balance = balance / value
            if (item.balance === null) {
                item.balance = 0
            }
            return item
        } else {
            item.coin = coin
            item.balance = 0
            return item
        }  
    } catch (error) {
        
        let item = {}
        item.coin = coin
        item.balance = 0
        return item
    }
}

async function getBalanceTokenETH(address, coin) { 
    try {
        let item = {}

        var decimals
      
  
        for(var i = 0; i < tokens.length; i++) {
            if(tokens[i].symbol === coin) {
                decimals = tokens[i].decimals
            }
        }

        let balance = await web3.eth.getBalance(address)
       
        if (balance) {
            let value = Math.pow(10, decimals)
            item.coin = coin
            item.balance = balance / value
            if (item.balance === null) {
                item.balance = 0
            }
            return item
        } else {
            item.coin = coin
            item.balance = 0
            return item
        }        
    } catch (error) {
        console.error(error);
    }
}

async function getBalanceTokenOld(address, coin) { 
    try {
        let item = {}
        const network = NETWORK_PARASWAP
        const paraSwap = new ParaSwap(network);

        var srcToken

        for(var i = 0; i < tokens.length; i++) {
            if(tokens[i].symbol === coin) {
                srcToken = tokens[i].address
            }
        }

        let token = await paraSwap.getBalance(address, srcToken)
       
        if (token) {
            let value = Math.pow(10, token.decimals)
            item.coin = coin
            item.balance = token.balance / value
            if (item.balance === null) {
                item.balance = 0
            }
            return item
        } else {
            item.coin = coin
            item.balance = 0
            return item
        }        
    } catch (error) {
        console.error(error);
    }
}

async function getBalanceBTC(address) { 
    try {
        method = 'get'
        url = "https://blockchain.info/q/addressbalance/" + address
      
        const balance = await axios[method](url,
            {
            headers:
                {
                'Content-Type': 'application/json',
                },
            }).then((response) => {
                if (response.data || response.data === 0) {
                    var item = {}
                    const satoshi = response.data
                    const value_satoshi = 100000000
                    item.coin = "BTC"
                    item.balance = (satoshi / value_satoshi) || 0
         
                    return item
                }
            }).catch((error) => {
                let item = {
                    coin: "BTC",
                    balance: 0
                }
                return item
            })
        return balance
    } catch (error) {
        console.error(error);
    }
}

async function getBalanceBTC2(address) { 
    try {
        method = 'get'
        url = 'https://api.blockcypher.com/v1/btc/'+process.env.BLOCKCYPHER+'/addrs/' + address + '/balance?token=' + "efe763283ba84fef88d23412be0c5970"
      
        const balance = await axios[method](url,
            {
            headers:
                {
                'Content-Type': 'application/json',
                },
            }).then((response) => {
                if (response.data) {
                    var item = {}
                    const satoshi = response.data.balance
                    const value_satoshi = 100000000
                    item.coin = "BTC"
                    item.balance = satoshi / value_satoshi
         
                    return item
                }
            }).catch((error) => {
    
                let item = {
                    coin: "BTC",
                    balance: 0
                }
                return item
            })
        return balance
    } catch (error) {
            console.error(error);
    }
}

async function getBalanceNEAR(nearId) { 
    try {
        const response = await validateNearId(nearId)

        if (response) {
            const keyStore = new keyStores.InMemoryKeyStore()
            const near = new Near(CONFIG(keyStore))

            const account = new Account(near.connection,nearId)
        
            const balanceAccount = await account.state()
            let valueStorage = Math.pow(10, 19)
            let valueYocto = Math.pow(10, 24)
            let item = {}
            item.coin = "NEAR"
            const storage = (balanceAccount.storage_usage * valueStorage) / valueYocto 
            item.balance = (balanceAccount.amount / valueYocto) - storage - 0.05
            if (item.balance === null) {
                item.balance = 0
            }
            return item
        } else {
            let item = {}
            item.coin = "NEAR"
            item.balance = 0
            return item
        }
    } catch (error) {
        return error
    }
}

async function validateNearId(nearId) { 
    try {
        const keyStore = new keyStores.InMemoryKeyStore()
        const near = new Near(CONFIG(keyStore))
        const account = new Account(near.connection, nearId)
        const response = await account.state()
            .then((response) => {
                return true
            }).catch((error) => {
                return false
            })
        return response
    } catch (error) {
        return error
    }
}

async function getUserDefix(defixId) { 
    try {
        const keyStore = new keyStores.InMemoryKeyStore()

        const keyPair = KeyPair.fromString(SIGNER_PRIVATEKEY)
        keyStore.setKey(NETWORK, SIGNER_ID, keyPair)

        const near = new Near(CONFIG(keyStore))

        const account = new Account(near.connection, SIGNER_ID)

        const contract = new Contract(account, CONTRACT_NAME, {
            viewMethods: ['get_user_defix'],
            sender: account
        })

        const response = await contract.get_user_defix(
            {
                defix_id: defixId,
            },
        )
        if (response[0]) {
            const account = response[0]
            return account
        } else {
            return false
        }
    } catch (error) {
        return false
    }
}

module.exports = { getBalance, getBalanceBTC, getBalanceToken, getBalanceNEAR, getUserDefix }