const express = require('express')
const router = express.Router()
const { transaction , getTransactionHistory, getEmailFlag} = require('../controllers/transactions')

router.post('/transaction', transaction)
router.post('/get-email-flag', getEmailFlag)
router.post('/transaction-history', getTransactionHistory)

module.exports = router