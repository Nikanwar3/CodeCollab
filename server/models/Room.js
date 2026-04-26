const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    language: { type: String, default: 'javascript' },
    code: { type: String, default: '// Start coding here...' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
