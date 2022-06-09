const axios = require("axios")
const { ParaSwap } = require('paraswap');
const Web3 = require("web3");
const nearAPI = require("near-api-js");
const nearSEED = require("near-seed-phrase");
const { CONFIG } = require('../helpers/utils')
const { TOKENS } = require('../helpers/tokens')
var nodemailer = require('nodemailer'); 
const hbs = require('nodemailer-express-handlebars')
const path = require('path');

const { Contract, keyStores, KeyPair , Near, Account} = nearAPI;
const { status2fa, validarCode2fa } = require('./2fa')

ETHEREUM_NETWORK = process.env.ETHEREUM_NETWORK
INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID

const NETWORK = process.env.NETWORK
const NETWORK_PARASWAP = process.env.NETWORK_PARASWAP

const web3 = new Web3(
    new Web3.providers.HttpProvider(
      `https://${ETHEREUM_NETWORK}.infura.io/v3/${INFURA_PROJECT_ID}`
    )
);

const tokens = TOKENS()

const swapPreviewETH = async (req, res) => {
    try {
        const { fromCoin, toCoin, amount } = req.body
        const network = NETWORK_PARASWAP
        const paraSwap = new ParaSwap(network);

        var srcToken
        var destToken
        var decimals

        for(var i = 0; i < tokens.length; i++) {
            if(tokens[i].symbol === fromCoin) {
                srcToken = tokens[i].address
                decimals = tokens[i].decimals
            }
        }
        for(var i = 0; i < tokens.length; i++) {
            if(tokens[i].symbol === toCoin) {
                destToken = tokens[i].address
            }
        }
        
        let value = Math.pow(10, decimals)
        const srcAmount = amount * value

        const priceRoute = await paraSwap.getRate(
            srcToken,
            destToken,
            srcAmount,
        );
        res.json(priceRoute)
    } catch (error) {
        return error
    }
}


const swapTokenETH = async (req, res) => {
  const { fromDefix } = req.body
  status2fa(fromDefix).then((respStatus) => {
      switch (respStatus) {
          case true: {
              const { code } = req.body;
              validarCode2fa(code, fromDefix).then((respValidacion) => {
                  console.log(respValidacion);
                  switch (respValidacion) {
                      case true: {
                          return EjecutarswapTokenETH(req, res);
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
              return EjecutarswapTokenETH(req, res);
          }
          default: res.status(500).json({respuesta: "Error interno del sistema"})
              break;
      }
  })
}


async function EjecutarswapTokenETH(req, res) {
    try {
        const { fromDefix, tokenA, tokenB ,privateKey, priceRoute } = req.body

        const network = NETWORK_PARASWAP
        const paraSwap = new ParaSwap(network);        
        const signer = web3.eth.accounts.privateKeyToAccount(privateKey)
        
        const txParams = await paraSwap.buildTx(
            priceRoute.srcToken,
            priceRoute.destToken,
            priceRoute.srcAmount,
            priceRoute.destAmount,
            priceRoute,
            signer.address,
        );

        const txSigned = await signer.signTransaction(txParams)
        const result = await web3.eth.sendSignedTransaction(txSigned.rawTransaction)

        const resSend = await getEmailFlagFN(fromDefix, "DEX")
        item = {
            user: fromDefix,
            montoA: priceRoute.srcAmount / Math.pow(10, priceRoute.srcDecimals),
            monedaA: tokenA,
            montoB: priceRoute.destAmount / Math.pow(10, priceRoute.destDecimals),
            monedaB: tokenB
        }
        EnvioCorreo(resSend, null, "swap", item)
        return res.json({respuesta: "ok", data: result})
    } catch (error) {
        return res.status(500).json({respuesta: "Error"})
    }
}

async function EnvioCorreo(from, to, type, data) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.USER_MAIL,
          pass: process.env.PASS_MAIL,
        }
      });
    
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
            return true
        });
      }
      break;
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
            if (tipo === "DEX") {
                if (resultados.rows[0].flag_dex) {
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

module.exports = { swapPreviewETH , swapTokenETH }