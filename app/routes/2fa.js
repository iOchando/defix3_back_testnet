const express = require('express')
const router = express.Router()
const { generar_2fa, activar_2fa, desactivar_2fa, status_2fa} = require('../controllers/2fa')

router.post('/generar-2fa', generar_2fa)
router.post('/activar-2fa', activar_2fa)
router.post('/desactivar-2fa', desactivar_2fa)
router.post('/status-2fa', status_2fa)

module.exports = router