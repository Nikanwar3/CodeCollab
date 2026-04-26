const router = require('express').Router();
const auth = require('../middleware/auth');
const { createRoom, getRoom, getUserRooms, saveCode, deleteRoom } = require('../controllers/roomController');

router.post('/', auth, createRoom);
router.get('/my', auth, getUserRooms);
router.get('/:roomId', auth, getRoom);
router.put('/:roomId/save', auth, saveCode);
router.delete('/:roomId', auth, deleteRoom);

module.exports = router;
