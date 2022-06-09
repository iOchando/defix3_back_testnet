const express = require('express')
const router = express.Router()
const { generateMnemonic, get_users, createWallet, importWallet, importFromMetamask, importFromNear, validateDefixIdAPI} = require('../controllers/wallet')
generateMnemonic
router.post('/generate-mnemonic', generateMnemonic)
router.post('/create-wallet', createWallet)
router.post('/import-wallet', importWallet)
router.post('/import-from-metamask', importFromMetamask)
router.post('/import-from-near', importFromNear)
router.post('/validate-defix3', validateDefixIdAPI)
router.get('/get-users', get_users)

module.exports = router