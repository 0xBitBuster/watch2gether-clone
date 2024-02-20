const express = require('express');
const router = express.Router();

const roomController = require('../controllers/roomController')

router.get('/:roomId', roomController.joinRoom)

module.exports = router;