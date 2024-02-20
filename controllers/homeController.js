const { v4: uuidv4 } = require('uuid');

/**
 * Home Screen
 * @route   GET /
 * @access  Public
 */
exports.home = (req, res) => {
    return res.status(200).render('home')
}

/**
 * Create Room
 * @route   GET /create-room
 * @access  Public
 */
exports.createRoom = (req, res) => {
    return res.status(200).redirect(`/room/${uuidv4()}`)
}