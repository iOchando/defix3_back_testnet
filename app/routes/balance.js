const express = require('express')
const router = express.Router()
const { getBalance } = require('../controllers/balance')

router.post('/get-balance', getBalance)

module.exports = router