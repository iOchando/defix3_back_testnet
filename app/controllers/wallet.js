const { CONFIG } = require('../helpers/utils')
const { dbConnect } = require('../../config/postgres')
const nearAPI = require("near-api-js");
const nearSEED = require("near-seed-phrase");
const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcoin = require('bitcoinjs-lib')
const Web3 = require('web3');
const ethers = require('ethers');
const axios = require('axios');
var nodemailer = require('nodemailer'); 
const hbs = require('nodemailer-express-handlebars')
const path = require('path');
/*
const secp = require('tiny-secp256k1');
const ecfacory = require('ecpair');
const path = require('path');
const { ParaSwap } = require('paraswap');
const { response } = require('express');
*/

const { utils, Contract, keyStores, KeyPair , Near, Account} = nearAPI;

const CONTRACT_NAME = process.env.CONTRACT_NAME;
const SIGNER_ID = process.env.SIGNER_ID;
const SIGNER_PRIVATEKEY = process.env.SIGNER_PRIVATEKEY;

const NETWORK = process.env.NETWORK
const ETHERSCAN = process.env.ETHERSCAN


const generateMnemonic = async (req, res) => {
    try {
        var { defixId } = req.body
        const response = await validateDefixId(defixId.toLowerCase())

        if (response === false) {
            let mnemonic = bip39.generateMnemonic()
            res.json({respuesta: "ok", mnemonic: mnemonic});
        } else {
            res.json({respuesta: "user"})
        }
    } catch (error) {
        res.status(500).json(error)
    }
}


const createWallet = async (req, res) => {
    try {
        const { defixId, mnemonic, email } = req.body
        const response = await validateDefixId(defixId.toLowerCase())

        if (response === false) {
            //let mnemonic = bip39.generateMnemonic()

            var wallet = {}
            wallet.defixId = defixId.toLowerCase()
            wallet.mnemonic = mnemonic
            wallet.btc_credentials = await createWalletBTC(mnemonic)
            wallet.eth_credentials = await createWalletETH(mnemonic)
            wallet.near_credentials = await createWalletNEAR(mnemonic)
            wallet.dai_credentials = wallet.eth_credentials
            wallet.usdt_credentials = wallet.eth_credentials
            wallet.usdc_credentials = wallet.eth_credentials

            const save = await saveInContract(defixId.toLowerCase(), wallet.btc_credentials, wallet.eth_credentials, wallet.near_credentials)
            console.log(save)
            if (save) {
                if(email !== null) {
                    EnviarPhraseCorreo(mnemonic, defixId.toLowerCase(), email)
                }
                res.json(wallet)
            } else {
                res.status(204).json()
            }
        } else {
            res.status(204).json()
        }
    } catch (error) {
        console.log(error)
        res.status(404).json()
    }
}
async function EnviarPhraseCorreo(phrase, userdefix, to) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.USER_MAIL,
          pass: process.env.PASS_MAIL,
        }
    });
  
    let from = process.env.EMAIL_USER;
  
    // point to the template folder
    const handlebarOptions = {
      viewEngine: {
          partialsDir: path.resolve("./views_email/"),
          defaultLayout: false,
      },
      viewPath: path.resolve("./views_email/"),
    };
 
    // use a template file with nodemailer
    transporter.use('compile', hbs(handlebarOptions))
    var mailOptions;
    mailOptions = {
      from: from,
      to: to,
      subject: 'Phrase secreta para recuperacion de cuenta Defix3',
      template: 'phraseEmail', // the name of the template file i.e email.handlebars
      context: {
        userdefix: userdefix,
        phrase: phrase,
      }
    }
  
    transporter.sendMail(mailOptions, function(error, info){
      return true;  
      /*if (error) {
          console.log('--------------------------------------------');
          console.log(error);
          console.log('--------------------------------------------');
      } else {
          console.log('Email sent: ' + info.response);
      }*/
    });
}


const importWallet = async (req, res) => {
    try {
        const { mnemonic } = req.body

        const keyStore = new keyStores.InMemoryKeyStore()

        const keyPair = KeyPair.fromString(SIGNER_PRIVATEKEY)
        keyStore.setKey(NETWORK, SIGNER_ID, keyPair)

        const near = new Near(CONFIG(keyStore))

        const account = new Account(near.connection, SIGNER_ID)

        const contract = new Contract(account, CONTRACT_NAME, {
            viewMethods: ['get_user_id'],
            sender: account,
        })

        const walletSeed = await nearSEED.parseSeedPhrase(mnemonic)
        const split = String(walletSeed.publicKey).split(':')
        const id = String(split[1])

        const response = await contract.get_user_id(
            {
                id: id,
            })
        
        if (response[0]) {
            let responseAccount = response[0]
            var wallet = {}
            
            const defixId = responseAccount.defix_id
            const nearId = responseAccount.near_id

            wallet.defixId = defixId
            wallet.mnemonic = mnemonic
            wallet.btc_credentials = await createWalletBTC(mnemonic)
            wallet.eth_credentials = await createWalletETH(mnemonic)
            wallet.near_credentials = await importWalletNEAR(nearId, mnemonic)
            wallet.dai_credentials = wallet.eth_credentials
            wallet.usdt_credentials = wallet.eth_credentials
            wallet.usdc_credentials = wallet.eth_credentials

            const conexion = await dbConnect()
            var result
            await conexion.query("update users\
                                set close_sessions = $1 where\
                                defix_id = $2\
                                ", [false, defixId])
                .then(() => {
                    result = true
                }).catch(() => {
                    result = false
                })

            if (result === true) {
                res.json(wallet)
            } else {
                res.status(204).json()
            }
        } else {
            res.status(204).json()
        }
    } catch (error) {
        res.json(error)
    }
}

async function createWalletBTC(mnemonic) { 
    try {
        var network
        var path
        if (NETWORK === "mainnet") {
            network = bitcoin.networks.bitcoin //use networks.testnet networks.bitcoin for testnet
            path = `m/49'/0'/0'/0` // Use m/49'/1'/0'/0 for testnet mainnet `m/49'/0'/0'/0
        } else {
            network = bitcoin.networks.testnet //use networks.testnet networks.bitcoin for testnet
            path = `m/49'/1/0'/0` // Use m/49'/1'/0'/0 for testnet mainnet `m/49'/0'/0'/0
        }
        
        const seed = bip39.mnemonicToSeedSync(mnemonic)
        let root = bip32.fromSeed(seed, network)

        let account = root.derivePath(path)
    
        let node = account.derive(0).derive(0)

        let btcAddress = bitcoin.payments.p2pkh({
            pubkey: node.publicKey,
            network: network,
            }).address

        var walletBTC = {}
        walletBTC.address = btcAddress
        walletBTC.privateKey = node.toWIF()
        return walletBTC
    } catch (error) {
        return false
    }
}

async function createWalletNEAR(mnemonic) { 
    try {
        const walletSeed = nearSEED.parseSeedPhrase(mnemonic)
        const keyPair = KeyPair.fromString(walletSeed.secretKey)
        const implicitAccountId = Buffer.from(keyPair.publicKey.data).toString('hex');

        var walletNEAR = {}
        walletNEAR.address = implicitAccountId
        walletNEAR.publicKey = walletSeed.publicKey
        walletNEAR.privateKey = walletSeed.secretKey

        return walletNEAR
    } catch (error) {
        return false
    }
}

async function importWalletNEAR(nearId, mnemonic) { 
    try {
        var walletSeed = await nearSEED.parseSeedPhrase(mnemonic)
        var walletNEAR = {}
        walletNEAR.address = nearId
        walletNEAR.publicKey = walletSeed.publicKey
        walletNEAR.privateKey = walletSeed.secretKey
        return walletNEAR
    } catch (error) {
        return false
    }
}

async function createWalletETH(mnemonic) { 
    try {
        //const provider = ethers.providers.getDefaultProvider({ name: 'ropsten', chainId: 3 });
        let provider = new ethers.providers.EtherscanProvider(ETHERSCAN);
        const wallet = ethers.Wallet.fromMnemonic(mnemonic)

        const signer = wallet.connect(provider)

        var walletETH = {}
        walletETH.address = wallet.address
        walletETH.publicKey = wallet.publicKey
        walletETH.privateKey = wallet.privateKey
        return walletETH
    } catch (error) {
        return false
    }
}

const importFromMetamask = async (req, res) => {
    try {
        const { defixId, mnemonic } = req.body

        const response = await validateDefixId(defixId.toLowerCase())

        if (response === false) {
            var wallet = {}
            wallet.defixId = defixId.toLowerCase()
            wallet.mnemonic = mnemonic
            wallet.btc_credentials = await createWalletBTC(mnemonic)
            wallet.eth_credentials = await createWalletETH(mnemonic)
            wallet.near_credentials = await createWalletNEAR(mnemonic)
            wallet.dai_credentials = wallet.eth_credentials
            wallet.usdt_credentials = wallet.eth_credentials
            wallet.usdc_credentials = wallet.eth_credentials
            
            await saveInContract(defixId.toLowerCase(), wallet.btc_credentials, wallet.eth_credentials, wallet.near_credentials)

            res.json(wallet)
        } else {
            res.status(204).json()
        }
    } catch (error) {
        res.json(error)
    }
}

const importFromNear = async (req, res) => {
    try {
        const { nearId, mnemonic } = req.body
        const defixId = String(nearId.toLowerCase()).split('.').shift() + ".defix3"

        const response = await validateNearId(nearId.toLowerCase())

        if (response) {
            const result = await validateKey(nearId.toLowerCase(), mnemonic)
            if (result === true) {
                var wallet = {}
                wallet.defixId = defixId
                wallet.mnemonic = mnemonic
                wallet.btc_credentials = await createWalletBTC(mnemonic)
                wallet.eth_credentials = await createWalletETH(mnemonic)
                wallet.dai_credentials = wallet.eth_credentials
                wallet.usdt_credentials = wallet.eth_credentials
                wallet.usdc_credentials = wallet.eth_credentials
                wallet.near_credentials = await importWalletNEAR(nearId.toLowerCase(), mnemonic)

                await saveInContract(defixId, wallet.btc_credentials, wallet.eth_credentials, wallet.near_credentials)

                res.json(wallet)
            }
            else {
                res.status(204).json()
            }
        } else {
            res.status(204).json()
        }
    } catch (error) {
        res.json(error)
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

const get_users = async (req, res) => {
    try {
        const keyStore = new keyStores.InMemoryKeyStore()

        const keyPair = KeyPair.fromString(SIGNER_PRIVATEKEY)
        keyStore.setKey(NETWORK, SIGNER_ID, keyPair)

        const near = new Near(CONFIG(keyStore))

        const account = new Account(near.connection, SIGNER_ID)

        const contract = new Contract(account, CONTRACT_NAME, {
            viewMethods: ['get_users'],
            sender: account
        })

        const response = await contract.get_users()
        res.json(response)
    } catch (error) {
        return error
    }
}

const validateDefixIdAPI = async (req, res) => {
    try {
        const { defixId } = req.body
        const response = await validateDefixId(defixId.toLowerCase())
        res.json(response)
    } catch (error) {
        return error
    }
}

async function validateDefixId(defixId) { 
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
            return true
        } else {
            return false
        }
    } catch (error) {
        return error
    }
}

async function validateKey(nearId, mnemonic) { 
    try {
        const seed = nearSEED.parseSeedPhrase(mnemonic)
        const keyStore = new keyStores.InMemoryKeyStore()
        const near = new Near(CONFIG(keyStore))

        const account = new Account(near.connection, nearId)
        const keys = await account.getAccessKeys()
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].public_key === seed.publicKey) {
                const permission = keys[i].access_key.permission
                if (permission === "FullAccess") {
                    return true
                }
                else {
                    return false
                }
            }
        } 
        return false
    } catch (error) {
        return error
    }
}

async function saveInContract(defixId, walletBTC, walletETH, walletNEAR) { 
    try {
        let addressBTC = {}
        addressBTC.name = "BTC"
        addressBTC.address = walletBTC.address

        let addressETH = {}
        addressETH.name = "ETH"
        addressETH.address = walletETH.address

        let addressDAI = {}
        addressDAI.name = "DAI"
        addressDAI.address = walletETH.address

        let addressUSDT = {}
        addressUSDT.name = "USDT"
        addressUSDT.address = walletETH.address

        let addressUSDC = {}
        addressUSDC.name = "USDC"
        addressUSDC.address = walletETH.address

        var addresses = []

        addresses.push(addressBTC)
        addresses.push(addressETH)
        addresses.push(addressDAI)
        addresses.push(addressUSDT)
        addresses.push(addressUSDC)
        
        const keyStore = new keyStores.InMemoryKeyStore()
        const keyPair = KeyPair.fromString(SIGNER_PRIVATEKEY)
        keyStore.setKey(NETWORK, SIGNER_ID, keyPair)

        const near = new Near(CONFIG(keyStore))

        const account = new Account(near.connection, SIGNER_ID)

        const contract = new Contract(account, CONTRACT_NAME, {
            changeMethods: ['set_user'],
            sender: account
        })

        const split = String(walletNEAR.publicKey).split(':')
        const id = String(split[1])

        const response = await contract.set_user(
                {
                    defix_id: defixId,
                    id: id,
                    near_id: walletNEAR.address,
                    addresses: addresses,
                },
            ).then( async () => {
                const conexion = await dbConnect()
                const result = await conexion.query(`insert into users
                    (defix_id, dosfa, secret)
                    values ($1, false, null)`, [defixId])
                        .then(() => {
                            return true
                        }).catch(() => {
                            return false
                        })
                
                if (result === true) {
                    return true
                } else {
                    return false
                }
            }).catch((error) => {
                return false
        })
        return response
    } catch (error) {
        return false
    }
}

module.exports = { generateMnemonic, createWallet, importWallet, importFromMetamask, importFromNear, validateDefixIdAPI, get_users}
