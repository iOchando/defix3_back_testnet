const express = require('express')
const router = express.Router()
const { swapPreviewETH, swapTokenETH } = require('../controllers/swap')

router.post('/swap-preview-eth', swapPreviewETH)
router.post('/swap-token-eth', swapTokenETH)

module.exports = router