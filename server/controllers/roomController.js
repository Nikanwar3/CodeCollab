const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');

exports.createRoom = async (req, res) => {
  try {
    const { name, language } = req.body;
    if (!name) return res.status(400).json({ message: 'Room name required' });

    const room = await Room.create({
      roomId: uuidv4(),
      name,
      language: language || 'javascript',
      createdBy: req.user.id,
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId }).populate('createdBy', 'username');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { code, language },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Saved', room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOneAndDelete({
      roomId: req.params.roomId,
      createdBy: req.user.id,
    });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
