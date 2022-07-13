const express = require('express')
const router = express.Router()
const { setEmailSuscribe }  = require('../controllers/suscribe')

router.post('/set-email-suscribe', setEmailSuscribe)

module.exports = router