import FriendRequest from '../models/FriendRequest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (receiverId === req.user._id.toString()) return res.status(400).json({ message: 'Cannot send request to yourself' });
    const currentUser = await User.findById(req.user._id);
    const receiverUser = await User.findById(receiverId);
    if (!receiverUser) return res.status(404).json({ message: 'User not found' });
    if (receiverUser.blockedUsers.includes(req.user._id)) return res.status(400).json({ message: 'Cannot send friend request to this user' });
    if (currentUser.blockedUsers.includes(receiverId)) return res.status(400).json({ message: 'Unblock user before sending friend request' });
    const existing = await FriendRequest.findOne({ $or: [{ sender: req.user._id, receiver: receiverId }, { sender: receiverId, receiver: req.user._id }] });
    if (existing) return res.status(400).json({ message: 'Friend request already exists' });
    const request = await FriendRequest.create({ sender: req.user._id, receiver: receiverId });
    await Notification.create({ user: receiverId, type: 'friend_request', message: `${req.user.fullName} sent you a friend request`, data: { senderId: req.user._id, requestId: request._id } });
    const populated = await FriendRequest.findById(request._id).populate('sender', 'fullName username profilePic');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.receiver.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });
    const currentUser = await User.findById(req.user._id);
    if (currentUser.blockedUsers.includes(request.sender)) return res.status(400).json({ message: 'Unblock user before accepting request' });
    request.status = 'accepted';
    await request.save();
    await Notification.create({ user: request.sender, type: 'friend_accepted', message: `${req.user.fullName} accepted your friend request`, data: { userId: req.user._id } });
    res.json(request);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.receiver.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Unauthorized' });
    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Friend request rejected' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user._id, status: 'pending' }).populate('sender', 'fullName username profilePic');
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getFriends = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const blockedIds = currentUser.blockedUsers.map((id) => id.toString());
    const sent = await FriendRequest.find({ sender: req.user._id, status: 'accepted', receiver: { $nin: blockedIds } }).populate('receiver', 'fullName username profilePic isOnline lastSeen');
    const received = await FriendRequest.find({ receiver: req.user._id, status: 'accepted', sender: { $nin: blockedIds } }).populate('sender', 'fullName username profilePic isOnline lastSeen');
    const friends = [...sent.map((r) => ({ ...r.receiver.toObject(), friendshipId: r._id })), ...received.map((r) => ({ ...r.sender.toObject(), friendshipId: r._id }))];
    res.json(friends);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    await FriendRequest.deleteOne({ $or: [{ sender: req.user._id, receiver: friendId, status: 'accepted' }, { sender: friendId, receiver: req.user._id, status: 'accepted' }] });
    res.json({ message: 'Friend removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getSentRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ sender: req.user._id, status: 'pending' }).populate('receiver', 'fullName username profilePic');
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendRequests, getFriends, removeFriend, getSentRequests };
