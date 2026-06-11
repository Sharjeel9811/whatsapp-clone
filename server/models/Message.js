import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, trim: true },
  file: { url: { type: String }, type: { type: String }, name: { type: String } },
  voice: { url: { type: String }, duration: { type: Number } },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  reactions: [{ emoji: { type: String, required: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deleted: { type: Boolean, default: false },
  system: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
