const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController')

router.get('/create-room', homeController.get_createRoom)
router.get('/', homeController.get_home)

module.exports = router;