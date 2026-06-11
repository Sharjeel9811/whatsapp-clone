import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 50 },
  username: { type: String, required: [true, 'Username is required'], unique: true, trim: true, lowercase: true, maxlength: 30 },
  email: { type: String, required: [true, 'Email is required'], unique: true, trim: true, lowercase: true },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  profilePic: { type: String, default: '' },
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
