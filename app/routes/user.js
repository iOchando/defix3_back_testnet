const express = require('express')
const router = express.Router()
const { getCloseAllSesions, closeAllSessions, setEmailData, getEmailData} = require('../controllers/user')

router.post('/close-all-sessions', closeAllSessions)
router.post('/get-close-all-sessions', getCloseAllSesions)
router.post('/set-email-data', setEmailData)
router.post('/get-email-data', getEmailData)

module.exports = router