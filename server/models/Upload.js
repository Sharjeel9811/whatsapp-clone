import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema({
  data: Buffer,
  mimetype: String,
  filename: String,
}, { timestamps: true });

export default mongoose.model('Upload', uploadSchema);
