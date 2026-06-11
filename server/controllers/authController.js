import User from '../models/User.js';
import Chat from '../models/Chat.js';
import generateToken from '../utils/generateToken.js';

const register = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'User with this email or username already exists' });
    const profilePic = req.file ? `/uploads/${req.file.filename}` : '';
    const user = await User.create({ fullName, username, email, password, profilePic });
    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save();
    res.status(201).json({
      _id: user._id, fullName: user.fullName, username: user.username,
      email: user.email, profilePic: user.profilePic, token: generateToken(user._id),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });
    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save();
    res.json({
      _id: user._id, fullName: user.fullName, username: user.username,
      email: user.email, profilePic: user.profilePic, token: generateToken(user._id),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const logout = async (req, res) => {
  try {
    req.user.isOnline = false;
    req.user.lastSeen = Date.now();
    await req.user.save();
    res.json({ message: 'Logged out successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMe = (req, res) => res.json(req.user);

const updateProfile = async (req, res) => {
  try {
    const { fullName } = req.body;
    const user = await User.findById(req.user._id);
    if (fullName) user.fullName = fullName;
    if (req.file) user.profilePic = `/uploads/${req.file.filename}`;
    await user.save();
    const chats = await Chat.find({ users: req.user._id }).select('users');
    const partnerIds = [...new Set(chats.flatMap((c) => c.users.map((u) => u.toString())).filter((id) => id !== req.user._id.toString()))];
    const io = req.app.get('io');
    if (io) {
      const payload = { userId: req.user._id, fullName: user.fullName, profilePic: user.profilePic };
      partnerIds.forEach((pid) => io.to(pid).emit('profile-updated', payload));
    }
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export { register, login, logout, getMe, updateProfile };
