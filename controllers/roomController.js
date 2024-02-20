const { v4: uuidv4 } = require('uuid');

const { validUUID } = require('../helpers/validation')

/**
 * Join a room
 * @route   GET /room/:roomId
 * @access  Public
 */
exports.joinRoom = (req, res) => {
    const roomId = req.params.roomId;
    
    if (validUUID(roomId)) {
        res.status(200).render('room', {
            roomId,
            domain: process.env.DOMAIN
        })
    } else {
        res.status(404).redirect(`/room/${uuidv4()}`)
    }
}
