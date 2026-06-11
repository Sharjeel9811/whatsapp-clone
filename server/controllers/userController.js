import User from '../models/User.js';

const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.search ? { $or: [{ fullName: { $regex: req.query.search, $options: 'i' } }, { username: { $regex: req.query.search, $options: 'i' } }] } : {};
    const currentUser = await User.findById(req.user._id);
    const blockedIds = currentUser.blockedUsers.map((id) => id.toString());
    const users = await User.find({ ...keyword, _id: { $ne: req.user._id, $nin: blockedIds } }).select('fullName username profilePic');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetId = req.params.userId;
    if (user.blockedUsers.includes(targetId)) return res.status(400).json({ message: 'User already blocked' });
    user.blockedUsers.push(targetId);
    await user.save();
    res.json({ message: 'User blocked successfully', blockedUsers: user.blockedUsers });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetId = req.params.userId;
    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== targetId);
    await user.save();
    res.json({ message: 'User unblocked successfully', blockedUsers: user.blockedUsers });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'fullName username profilePic');
    res.json(user.blockedUsers);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getUserProfile = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId).select('-password');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    const currentUser = await User.findById(req.user._id);
    const isBlocked = currentUser.blockedUsers.includes(targetUser._id);
    res.json({ ...targetUser.toJSON(), isBlocked });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export { searchUsers, blockUser, unblockUser, getBlockedUsers, getUserProfile };
