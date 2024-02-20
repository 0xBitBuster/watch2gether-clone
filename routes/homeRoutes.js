const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController')

router.get('/create-room', homeController.createRoom)
router.get('/', homeController.home)

module.exports = router;