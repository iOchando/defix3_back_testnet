const express = require('express');
const router = express.Router();
const { getUsersDefix } = require('../controllers/admin');
const authMiddleware = require("../middleware/admin");

router.get('/get-users-defix', authMiddleware, getUsersDefix);

module.exports = router;
