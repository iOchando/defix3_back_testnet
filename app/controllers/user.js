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
/*
const secp = require('tiny-secp256k1');
const ecfacory = require('ecpair');
const path = require('path');
const { ParaSwap } = require('paraswap');
const { response } = require('express');
*/

const { utils, Contract, keyStores, KeyPair , Near, Account} = nearAPI;
const { status2fa, validarCode2fa } = require('./2fa')


const CONTRACT_NAME = process.env.CONTRACT_NAME;
const SIGNER_ID = process.env.SIGNER_ID;
const SIGNER_PRIVATEKEY = process.env.SIGNER_PRIVATEKEY;

const NETWORK = process.env.NETWORK


const setEmailData = async (req, res) => {
    const { defixId } = req.body
    status2fa(defixId).then((respStatus) => {
        switch (respStatus) {
            case true: {
                const { code } = req.body;
                validarCode2fa(code, defixId).then((respValidacion) => {
                    console.log(respValidacion);
                    switch (respValidacion) {
                        case true: {
                            return EjecutarsetEmailData(req, res);
                        }
                        case false: {
                            res.json({respuesta: "code"});
                        }
                            break;
                        default: res.status(500).json({respuesta: "Error interno del sistema"})
                            break;
                    }
                })
            }
                break;
            case false: {
                return EjecutarsetEmailData(req, res);
            }
            default: res.status(500).json({respuesta: "Error interno del sistema"})
                break;
        }
    })
}

async function EjecutarsetEmailData(req, res) {
    try {
        const { defixId, mnemonic, email, flag_send, flag_receive, flag_dex, flag_fiat, name, last_name, legal_document, type_document } = req.body

        const response = await validateMnemonicDefix(defixId, mnemonic)
        var result 

        if (legal_document ==! null) {
            if (type_document ==! "v" && type_document ==! "j") { 
                return res.status(204).json({respuesta: "Error tipo de documento"})
            }
        }

        if (response === true) {
            const conexion = await dbConnect()
            await conexion.query("update users\
                                set email = $1, flag_send = $2, flag_receive = $3, flag_dex = $4, flag_fiat = $5, name = $6, last_name = $7, legal_document = $8, type_document=$9 where\
                                defix_id = $10\
                                ", [email, flag_send, flag_receive, flag_dex, flag_fiat, name, last_name, legal_document, type_document, defixId])
                .then(() => {
                    result = true
                }).catch(() => {
                    result = false
                })
            return res.json({respuesta: "ok", data: result})
        } else {
            return res.json({respuesta: "user"})
        }
    } catch (error) {
        return res.status(500).json({respuesta: "Error interno del sistema"})
    }
}

const getEmailData = async (req, res) => {
    try {
        const { defixId } = req.body
        const response = await validateDefixId(defixId)

        if (response) {
            const conexion = await dbConnect()
        
            const resultados = await conexion.query("select email, flag_send, flag_receive, flag_dex, flag_fiat, name, last_name, legal_document, type_document, dosfa \
                                                    from users where \
                                                    defix_id = $1\
                                                    ", [defixId])
            res.json(resultados.rows[0])
        } else {
            res.status(204).json()
        }
    } catch (error) {
        return error
    }
}

const closeAllSessions = async (req, res) => {
    try {
        const { defixId, mnemonic } = req.body

        const response = await validateMnemonicDefix(defixId, mnemonic)
        var result 

        if (response === true) {
            const conexion = await dbConnect()
            await conexion.query("update users\
                                set close_sessions = $1 where\
                                defix_id = $2\
                                ", [true, defixId])
                .then(() => {
                    result = true
                }).catch(() => {
                    result = false
                })
            res.json(result)
        } else {
            res.status(204).json()
        }
    } catch (error) {
        res.json(error)
    }
}


const getCloseAllSesions = async (req, res) => {
    try {
        const { defixId } = req.body

        const response = await validateDefixId(defixId)

        if (response) {
            const conexion = await dbConnect()
        
            const resultados = await conexion.query("select close_sessions \
                                                    from users where \
                                                    defix_id = $1\
                                                    ", [defixId])
            res.json(resultados.rows[0].close_sessions)
        } else {
            res.status(204).json
        }
    } catch (error) {
        return error
    }
}


async function validateMnemonicDefix(defixId, mnemonic) { 
    try {
        const keyStore = new keyStores.InMemoryKeyStore()
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

        let walletNEAR = nearSEED.parseSeedPhrase(mnemonic)
        const split = String(walletNEAR.publicKey).split(':')
        const id = String(split[1])

        if (response[0]) {
            const defixAccount = response[0]
            if (defixAccount.id === id) {
                return true
            } else {
                return false
            }
        } else {
            return false
        }
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

module.exports = { getCloseAllSesions, closeAllSessions, setEmailData, getEmailData }