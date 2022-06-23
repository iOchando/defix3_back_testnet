const { CONFIG } = require('../helpers/utils')
const { getBalanceBTC, getBalanceToken, getBalanceNEAR, getUserDefix } = require('./balance')
const nearAPI = require("near-api-js");
const nearSEED = require("near-seed-phrase");

const { utils, Contract, keyStores, KeyPair , Near, Account} = nearAPI;

const CONTRACT_NAME = process.env.CONTRACT_NAME;
const SIGNER_ID = process.env.SIGNER_ID;
const SIGNER_PRIVATEKEY = process.env.SIGNER_PRIVATEKEY;

const NETWORK = process.env.NETWORK

const getUsersDefix = async (req, res) => {
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
        res.status(404).json
    }
}

module.exports = { getUsersDefix }