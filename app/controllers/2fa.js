const { CONFIG } = require('../helpers/utils')
const { dbConnect } = require('../../config/postgres')
const nearAPI = require("near-api-js");
const nearSEED = require("near-seed-phrase");
const { authenticator } = require('otplib')
const QRCode = require('qrcode')

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

const NETWORK = process.env.NETWORK;


const generar_2fa = async (req, res) => {
    try {
        const { defixId, mnemonic } = req.body
        const response = await validateMnemonicDefix(defixId, mnemonic)
        
        if (response === true) {
            const conexion = await dbConnect()
            const resultados = await conexion.query("select dosfa, secret from users where defix_id = $1", [defixId])
            
            if (resultados.rowCount === 1) {
                switch (resultados.rows[0].dosfa) {
                    case true: {
                        res.json({respuesta: "dosfa"})
                    }
                        break;
                    case false: {
                        if(resultados.rows[0].secret == null){
                            const secret = authenticator.generateSecret();
                            await conexion.query("update users set secret = $1 where defix_id = $2 ", [secret, defixId])
                            .then(() => {
                                let codigo = authenticator.keyuri(defixId, 'Defix3 App', secret)
                                QRCode.toDataURL(codigo, (err, url) => {
                                    if (err) {
                                    throw err
                                    }
                                    res.json({respuesta: "ok", qr: url, codigo: secret})
                                })
                            }).catch(() => {
                                res.status(500).json({respuesta: "error en la base de datos"})        
                            })
                        } else {
                            let codigo = authenticator.keyuri(defixId, 'Defix3 App', resultados.rows[0].secret)
                            QRCode.toDataURL(codigo, (err, url) => {
                                if (err) {
                                throw err
                                }
                                res.json({respuesta: "ok", qr: url, codigo: resultados.rows[0].secret})
                            })
                        }
                    }
                        break;
                
                    default:
                        res.status(500).json({ respuesta: "error en el campo dosfa" })
                        break;
                }
            } else {
                res.status(500).json({ respuesta: "user no existe" })
            }
        }
    } catch (error) {
        return res.status(500).json({ respuesta: error })
    }
}


const activar_2fa = async (req, res) => {
    const { defixId, mnemonic, code } = req.body
    const response = await validateMnemonicDefix(defixId, mnemonic)
    
    if (response === true) {
        const conexion = await dbConnect();
    
        const resultados = await conexion.query("select dosfa, secret from users where defix_id = $1", [defixId]);
        console.log(resultados.rowCount)
        if(resultados.rowCount === 1) {
            console.log(resultados.rows[0].secret)
            if(resultados.rows[0].secret != null) {
                var auth = authenticator.check(code.toString(), resultados.rows[0].secret)
                console.log(resultados.rows[0].secret);
                console.log(auth);
                if (auth) {
                    await conexion.query("update users set dosfa = true where defix_id = $1 ", [defixId])
                    .then(() => {
                        res.json({respuesta: "ok"});
                    }).catch(() => {
                        res.status(500).json({respuesta: "error en la base de datos"});
                    })
                } else {
                    res.json({respuesta: "code"});
                }
            } else {
                res.json({respuesta: "secret"});
            }
        }
    }
}

const desactivar_2fa = async (req, res) => {
    const { defixId, code } = req.body
    //const response = await validateMnemonicDefix(defixId, mnemonic)
    validarCode2fa(code, defixId).then(async result => {
        switch (result) {
            case true: {
                const conexion = await dbConnect();
    
                const resultados = await conexion.query("select dosfa, secret from users where defix_id = $1", [defixId]);
                if(resultados.rowCount === 1) {
                    if(resultados.rows[0].dosfa === true) {
                        await conexion.query("update users set dosfa = false, secret = null where defix_id = $1 ", [defixId])
                        .then(() => {
                            res.json({respuesta: "ok"});
                        }).catch(() => {
                            res.status(500).json({respuesta: "error en la base de datos"});
                        })                
                    } else {
                        res.json({respuesta: "ok"});
                    }
                }
            }
                break;
            case false: {
                res.json({respuesta: "code"});
            }
                break;
            default: res.status(500).json({respuesta: "error inesperado"});
                break;
        }
    });
}

async function status2fa(defixId) {
    const conexion = await dbConnect();
    const resultados = await conexion.query("select dosfa from users where defix_id = $1", [defixId]);
    if(resultados.rowCount === 1) {
        return resultados.rows[0].dosfa;
    } 
    return null;
}


const status_2fa = async (req, res) => {
    const { defixId } = req.body
    status2fa(defixId).then(result => {
        res.json(result);
    });
}

async function validarCode2fa(code, defixId) { 
    const conexion = await dbConnect();
    const resultados = await conexion.query("select secret from users where defix_id = $1", [defixId]);
    if(resultados.rowCount === 1) {
        var auth = authenticator.check(String(code), resultados.rows[0].secret)
        return auth;
    }
    return null
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

module.exports = { generar_2fa, activar_2fa, desactivar_2fa, status2fa, status_2fa, validarCode2fa }