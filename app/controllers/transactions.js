const { CONFIG } = require('../helpers/utils')
const { TOKENS } = require('../helpers/tokens')
const nearAPI = require("near-api-js");
const nearSEED = require("near-seed-phrase");
const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcoin = require('bitcoinjs-lib')
const ethers = require('ethers');
const axios = require('axios');
const { dbConnect } = require('../../config/postgres')
const bitcore = require('bitcore-lib');
const Web3 = require('web3');
const secp = require('tiny-secp256k1');
const ecfacory = require('ecpair');
const path = require('path');

var nodemailer = require('nodemailer'); 
const hbs = require('nodemailer-express-handlebars')

const { utils, Contract, keyStores, KeyPair , Near, Account} = nearAPI;
const { status2fa, validarCode2fa } = require('./2fa')

ETHEREUM_NETWORK = process.env.ETHEREUM_NETWORK
INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID

const CONTRACT_NAME = process.env.CONTRACT_NAME;
const SIGNER_ID = process.env.SIGNER_ID;
const SIGNER_PRIVATEKEY = process.env.SIGNER_PRIVATEKEY;

const NETWORK = process.env.NETWORK
const ETHERSCAN = process.env.ETHERSCAN

const tokens = TOKENS()

const web3 = new Web3(
    new Web3.providers.HttpProvider(
      `https://${ETHEREUM_NETWORK}.infura.io/v3/${INFURA_PROJECT_ID}`
    )
  );

const transaction = async (req, res) => {
    const { fromDefix } = req.body
    status2fa(fromDefix).then((respStatus) => {
        switch (respStatus) {
            case true: {
                const { code } = req.body;
                validarCode2fa(code, fromDefix).then((respValidacion) => {
                    console.log(respValidacion);
                    switch (respValidacion) {
                        case true: {
                            return Ejecutartransaction(req, res);
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
                return Ejecutartransaction(req, res);
            }
            default: res.status(500).json({respuesta: "Error interno del sistema"})
                break;
        }
    })
}


async function Ejecutartransaction(req, res) {
    try {
        const { fromDefix, privateKey, toDefix, coin, amount, type } = req.body
        var response;
        if (type === "1") {
            const fromAddress = await getUserDefix(fromDefix, coin)
            const toAddress = await getUserDefix(toDefix, coin)
            let tipoEnvio = "user"
            
            if (fromAddress && toAddress) {
                if (coin === "BTC") {
                    response = await transactionBTC(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                    console.log(response)
                } else if (coin === "NEAR"){
                    response = await transactionNEAR(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                } else if (coin === "ETH"){
                    response = await transactionETH(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                    
                } else if (coin === "DAI") {
                    response = await transactionToken(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                    
                } else if (coin === "USDT") {
                    response = await transactionToken(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                    
                } else if (coin === "USDC") {
                    response = await transactionToken(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                    
                }
                return res.json({respuesta: "ok", data: response})
            } else {
                return res.json({respuesta: "wallet"})
            }
        } else if (type === "2"){
            const fromAddress = await getUserDefix(fromDefix, coin)
            const toAddress = toDefix
            let tipoEnvio = "wallet"
            if (fromAddress && toAddress) {
                if (coin === "BTC") {
                    response = await transactionBTC(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                } else if (coin === "NEAR"){
                    response = await transactionNEAR(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                } else if (coin === "ETH"){
                    response = await transactionETH(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                } else if (coin === "DAI") {
                    response = await transactionToken(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                } else if (coin === "USDT") {
                    response = await transactionToken(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                } else if (coin === "USDC") {
                    response = await transactionToken(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio)
                }
                return res.json({respuesta: "ok", data: response})
            } else {
                return res.json({respuesta: "wallet"})
            }
        }
    } catch (error) {
        return res.json(error)
    }
}

async function transactionBTC(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio) { 
    try {
        var network
        if (NETWORK === "mainnet") {
            network = bitcoin.networks.bitcoin //use networks.testnet networks.bitcoin for testnet
        } else {
            network = bitcoin.networks.testnet //use networks.testnet networks.bitcoin for testnet
        }

        const value_satoshi = 100000000
        const amountSatoshi = amount * value_satoshi
        
        var ECPair = ecfacory.ECPairFactory(secp);
        var keys = ECPair.fromWIF(privateKey ,network)

        //var data = '{\n    "inputs": [\n        {\n            "addresses": [\n                "' + fromAddress +'"\n            ]\n        }\n    ],\n    "outputs": [\n        {\n            "addresses": [\n                "'+ toAddress +'"\n            ],\n            "value": '+ amountSatoshi +'\n        }\n    ]\n}';
        var data = {
            inputs: [
                {
                    addresses: [
                        fromAddress
                    ]
                }
            ],
            outputs: [
                {
                    addresses: [
                        fromAddress
                    ],
                    value: amountSatoshi
                }
            ]
        }
        var config = {
            method: 'post',
            url: 'https://api.blockcypher.com/v1/btc/'+process.env.BLOCKCYPHER+'/txs/new',
            headers: {
                'Content-Type': 'application/json'
            },
            data: data
        };

        var txHash
        
        const response = await axios(config)
            .then(function (tmptx) {
                console.log("hola")
                tmptx.data.pubkeys = [];
                tmptx.data.signatures = tmptx.data.tosign.map(function (tosign, n) {
                    tmptx.data.pubkeys.push(keys.publicKey.toString('hex'));
                    return bitcoin.script.signature.encode(
                        keys.sign(Buffer.from(tosign, "hex")),
                        0x01,
                    ).toString("hex").slice(0, -2);
                    });
                    
                const result = axios.post('https://api.blockcypher.com/v1/btc/'+process.env.BLOCKCYPHER+'/txs/send', tmptx.data)
                console.log(result)
                    .then(function (finaltx) {
                        txHash = finaltx.tx.hash
                        return true
                    })
                    .catch(function (xhr) {
                        return xhr
                    });
                return result
            })
            .catch(function (error) {
                console.log("error")
                return error
            });
  
        if (response === true) {
            const transaction = await saveTransaction(fromDefix, toDefix, coin, amount, fromAddress, toAddress, txHash)
            const resSend = await getEmailFlagFN(fromDefix, "SEND")
            const resReceive = await getEmailFlagFN(toDefix, "RECEIVE")
            item = {
                monto: amount,
                moneda: coin,
                receptor: toDefix,
                emisor: fromDefix,
                tipoEnvio: tipoEnvio
            }
            EnvioCorreo(resSend, resReceive, "envio", item)
            return transaction
        }
    } catch (error) {
        return error
    }
}

async function transactionNEAR(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio) { 
    try {
        const keyStore = new keyStores.InMemoryKeyStore()

        const keyPair = KeyPair.fromString(privateKey)
        keyStore.setKey(NETWORK, fromAddress, keyPair)

        const near = new Near(CONFIG(keyStore))

        const account = new Account(near.connection, fromAddress)
        
        const amountInYocto = utils.format.parseNearAmount(amount)

        const response = await account.sendMoney(
            toAddress, // receiver account
            amountInYocto // amount in yoctoNEAR
          )

        if (response) {
            const transaction = await saveTransaction(fromDefix, toDefix, coin, amount, fromAddress, toAddress, response.transaction.hash)
            const resSend = await getEmailFlagFN(fromDefix, "SEND")
            const resReceive = await getEmailFlagFN(toDefix, "RECEIVE")
            item = {
                monto: amount,
                moneda: coin,
                receptor: toDefix,
                emisor: fromDefix,
                tipoEnvio: tipoEnvio
            }
            EnvioCorreo(resSend, resReceive, "envio", item)
            return transaction
        } else {
            return false
        }

    } catch (error) {
        return error
    }
}

async function transactionETH(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio) { 
    try {
        const tx = {
            from: fromAddress,
            to: toAddress,
            value: web3.utils.toWei(amount),
          };
        tx.gas = await web3.eth.estimateGas(tx);

        const signer = web3.eth.accounts.privateKeyToAccount(privateKey)
        const txSigned = await signer.signTransaction(tx)
        const result = await web3.eth.sendSignedTransaction(txSigned.rawTransaction)

        if (result) {
            const transaction = await saveTransaction(fromDefix, toDefix, coin, amount, fromAddress, toAddress, result.transactionHash)
            const resSend = await getEmailFlagFN(fromDefix, "SEND")
            const resReceive = await getEmailFlagFN(toDefix, "RECEIVE")
            item = {
                monto: amount,
                moneda: coin,
                receptor: toDefix,
                emisor: fromDefix,
                tipoEnvio: tipoEnvio
            }
            EnvioCorreo(resSend, resReceive, "envio", item)
            return transaction
        } else {
            return result
        }

    } catch (error) {
        return error
    }
}

async function transactionToken(fromDefix, fromAddress, privateKey, toDefix, toAddress, coin, amount, tipoEnvio) { 
    try {
        let provider = new ethers.providers.EtherscanProvider(ETHERSCAN);
        const wallet = new ethers.Wallet(privateKey)
        const signer = wallet.connect(provider)

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
        const contract = new ethers.Contract(srcToken, minABI, signer);
        let value = Math.pow(10, decimals)
        const srcAmount = amount * value

        const tx = await contract.transfer(toAddress, srcAmount);

        if (tx) {
            const transaction = await saveTransaction(fromDefix, toDefix, coin, amount, fromAddress, toAddress, tx.hash)
            const resSend = await getEmailFlagFN(fromDefix, "SEND")
            const resReceive = await getEmailFlagFN(toDefix, "RECEIVE")
            item = {
                monto: amount,
                moneda: coin,
                receptor: toDefix,
                emisor: fromDefix,
                tipoEnvio: tipoEnvio
            }
            EnvioCorreo(resSend, resReceive, "envio", item)
            return transaction
        } else {
            return tx
        }
    } catch (error) {
        return false
    }
}

async function saveTransaction(fromDefix, toDefix, coin, amount, fromAddress, toAddress, hash) { 
    try {        
        let date_ob = new Date();
        let date = ("0" + date_ob.getDate()).slice(-2);
        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
        let year = date_ob.getFullYear();
        let hours = date_ob.getHours();
        let minutes = date_ob.getMinutes();
        let seconds = date_ob.getSeconds();
        let date_time = (year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
        let dateFech = (year + "-" + month + "-" + date)

        const conexion = await dbConnect()
        const response = await conexion.query(`insert into transactions
        (from_defix, from_address, to_defix, to_address, coin, value, date_time, date_fech ,date_year, date_month, hash)
        values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [fromDefix, fromAddress, toDefix, toAddress, coin, String(amount), String(date_time), String(dateFech), String(year), String(month), hash])
            .then(() => {
                var transaction = {}
                transaction.from_defix = fromDefix
                transaction.from_address = fromAddress
                transaction.to_defix = toDefix
                transaction.to_address = toAddress
                transaction.coin = coin
                transaction.value = String(amount)
                transaction.date_time = String(date_time)
                transaction.date_fech = String(dateFech)
                transaction.date_year = String(year)
                transaction.date_month = String(month)
                transaction.hash = hash
                return transaction
            }).catch((error) => {
                return false
            })
        return response
    } catch (error) {
        return false
    }
}

async function getUserDefix(defixId, coin) { 
    try {
        const keyStore = new keyStores.InMemoryKeyStore()

        const CONTRACT_NAME = process.env.CONTRACT_NAME;
        const SIGNER_ID = process.env.SIGNER_ID;
        const SIGNER_PRIVATEKEY = process.env.SIGNER_PRIVATEKEY;

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
            if (coin == "NEAR") {
                return account.near_id
            } else {
                for (var i = 0; i < account.addresses.length; i++) {
                    if (account.addresses[i].name === coin) {
                        return account.addresses[i].address
                    }
                }
            }
        } else {
            return false
        }
    } catch (error) {
        return false
    }
}

async function getEmailFlagFN(defixId, tipo) { 
    try {
        const conexion = await dbConnect()
        
        const resultados = await conexion.query("select email, flag_send, flag_receive, flag_dex, flag_fiat \
                                                from users where \
                                                defix_id = $1\
                                                ", [defixId])

        if (resultados.rows[0]) {
            if (tipo === "SEND") {
                if (resultados.rows[0].flag_send) {
                    return resultados.rows[0].email
                } else {
                    return null
                }
            } else if (tipo === "RECEIVE") {
                if (resultados.rows[0].flag_receive) {
                    return resultados.rows[0].email
                } else {
                    return null
                }
            }
        }
    } catch (error) {
        return null
    }
}
// fin configuracion envio correo //

async function EnvioCorreo(from, to, type, data) {
    console.log(from, to, type, data)
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.USER_MAIL,
      pass: process.env.PASS_MAIL,
    }
  });

  console.log(process.env.USER_MAIL)
  console.log(process.env.PASS_MAIL)

  let from_admin = process.env.USER_MAIL;

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

  
  switch (type) {
    case 'envio': {
      if(from != null) {
        // Envio al emisor
        let tipoEnvio = '';
        switch (data.tipoEnvio) {
          case 'user': tipoEnvio = 'al usuario';
          break;
          case 'wallet': tipoEnvio = 'a la siguinte direccion';
          break;
        }

        console.log(tipoEnvio)
        if(tipoEnvio != '') {
          var mailOptionsFrom;
          mailOptionsFrom = {
            from: from_admin,
            to: from,
            subject: 'Envio de fondos',
            template: 'EnvioFondos', // the name of the template file i.e email.handlebars
            context: {
              monto: data.monto,
              moneda: data.moneda,
              receptor: data.receptor,
              emisor: data.emisor,
              tipoEnvio: tipoEnvio,
            }
          }
          transporter.sendMail(mailOptionsFrom, function(error, info){
            console.log("error",error)
            console.log("info",info)
            return true
          });
        }
      }

      if(to != null) {
        // Envio al receptor
        var mailOptionsTo;
        mailOptionsTo = {
          from: from_admin,
          to: to,
          subject: 'Ha recibido fondos',
          template: 'RecepcionFondos', // the name of the template file i.e email.handlebars
          context: {
            monto: data.monto,
            moneda: data.moneda,
            receptor: data.receptor,
            emisor: data.emisor,
          }
        }
        transporter.sendMail(mailOptionsTo, function(error, info){
            return true
        });
      }
    }
    break;
    case 'swap': {
      var mailOptions = {
        from: from_admin,
        to: from,
        subject: 'Notificacion de swap',
        template: 'swap', // the name of the template file i.e email.handlebars
        context: {
          user: data.user,
          montoA: data.montoA,
          monedaA: data.monedaA,
          montoB: data.montoB,
          monedaB: data.monedaB,
        }
      }
      transporter.sendMail(mailOptions, function(error, info){
        console.log("error", error)
        console.log("info", info)
        return true
      });
    }
    break;
  }  
}

const getEmailFlag = async (req, res) => {
    try {
        const { defixId, tipo } = req.body
        const conexion = await dbConnect()
        
        const resultados = await conexion.query("select email, flag_send, flag_receive, flag_dex, flag_fiat \
                                                from users where \
                                                defix_id = $1\
                                                ", [defixId])

        if (resultados.rows[0]) {
            if (tipo === "SEND") {
                res.json(resultados.rows[0].flag_send)
            } else if (tipo === "RECEIVE") {
                res.json(resultados.rows[0].flag_receive)
            }
        }
    } catch (error) {
        res.json(error)
    }
}

const getTransactionHistory = async (req, res) => {
    try {
        const { defixId, coin, date_year, date_month } = req.body

        const conexion = await dbConnect()
        
        const resultados = await conexion.query("select * \
                                                from transactions where \
                                                ((from_defix = $1 or to_defix = $1) or ('%' = $1 or '%' = $1))\
                                                and (coin = $2 or '%' = $2)\
                                                and (date_year = $3 or '%' = $3)\
                                                and (date_month = $4 or '%' = $4)\
                                                ", [defixId, coin, date_year, date_month])
        res.json(resultados.rows)
        

        /*
        const resultados = await conexion.query('select * \
                                                from transactions where \
                                                (from_defix = $1 or to_defix = $1)\
                                                ', [defixId])
        var transactions = resultados.rows
        if (coin) {
            transactions = transactions.map(function(x) {
                if (x.coin === coin) {
                    return x ;
                } 
             });
        }

        res.json(transactions)


        const { defixId, coin } = req.body
        
        const keyStore = new keyStores.InMemoryKeyStore()

        const CONTRACT_NAME = process.env.CONTRACT_NAME;
        const SIGNER_ID = process.env.SIGNER_ID;

        const near = new Near(CONFIG(keyStore))

        const account = new Account(near.connection, SIGNER_ID)

        const contract = new Contract(account, CONTRACT_NAME, {
            viewMethods: ['get_transactions'],
            sender: account
        })

        const response = await contract.get_transactions(
            {date_time character varying COLLATE pg_catalog."default" NOT NULL,
        */
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

async function validateKey(nearId, mnemonic) { 
    try {
        const seed = nearSEED.parseSeedPhrase(mnemonic)
        const keyStore = new keyStores.InMemoryKeyStore()

        const near = new Near(CONFIG(keyStore))

        const account = new Account(near.connection,nearId)
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

module.exports = { transaction , getTransactionHistory, getEmailFlag}