import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'UserId param missing' });
    let chat = await Chat.findOne({ isGroupChat: false, users: { $all: [req.user._id, userId] } })
      .populate('users', '-password').populate('latestMessage');
    if (chat) {
      chat = await User.populate(chat, { path: 'latestMessage.sender', select: 'fullName username profilePic' });
      return res.json(chat);
    }
    chat = await Chat.create({ chatName: 'sender', isGroupChat: false, users: [req.user._id, userId] });
    const fullChat = await Chat.findOne({ _id: chat._id }).populate('users', '-password');
    res.status(201).json(fullChat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const fetchChats = async (req, res) => {
  try {
    let chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password').populate('groupAdmin', '-password').populate('latestMessage')
      .sort({ updatedAt: -1 });
    chats = await User.populate(chats, { path: 'latestMessage.sender', select: 'fullName username profilePic' });
    res.json(chats);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createGroupChat = async (req, res) => {
  try {
    const { users, chatName } = req.body;
    if (!users || !chatName) return res.status(400).json({ message: 'Please provide users and chatName' });
    if (users.length < 2) return res.status(400).json({ message: 'Group must have at least 2 members' });
    const allUsers = [...users, req.user._id];
    const groupChat = await Chat.create({ chatName, isGroupChat: true, users: allUsers, groupAdmin: req.user._id });
    const fullGroup = await Chat.findOne({ _id: groupChat._id }).populate('users', '-password').populate('groupAdmin', '-password');
    for (const userId of users) {
      await Notification.create({
        user: userId, type: 'group_invite',
        message: `${req.user.fullName} added you to ${chatName}`,
        data: { chatId: groupChat._id, chatName },
      });
    }
    res.status(201).json(fullGroup);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addToGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.groupAdmin.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only admin can add members' });
    if (chat.users.includes(userId)) return res.status(400).json({ message: 'User already in group' });
    chat.users.push(userId);
    await chat.save();
    const updated = await Chat.findById(chatId).populate('users', '-password').populate('groupAdmin', '-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const removeFromGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.groupAdmin.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only admin can remove members' });
    chat.users = chat.users.filter((u) => u.toString() !== userId);
    await chat.save();
    const updated = await Chat.findById(chatId).populate('users', '-password').populate('groupAdmin', '-password');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const leaveGroup = async (req, res) => {
  try {
    const { chatId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    chat.users = chat.users.filter((u) => u.toString() !== req.user._id.toString());
    if (chat.groupAdmin.toString() === req.user._id.toString() && chat.users.length > 0) {
      chat.groupAdmin = chat.users[0];
    }
    await chat.save();
    const sysMsg = await Message.create({
      chat: chatId, sender: req.user._id, content: `${req.user.fullName} has left the group`,
      system: true, readBy: [req.user._id], deliveredTo: [req.user._id],
    });
    const populated = await Message.findById(sysMsg._id).populate('sender', 'fullName username profilePic');
    const io = req.app.get('io');
    if (io) chat.users.forEach((uid) => io.to(uid.toString()).emit('message-received', populated));
    const updated = await Chat.findById(chatId).populate('users', '-password').populate('groupAdmin', '-password');
    updated.latestMessage = populated;
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export { accessChat, fetchChats, createGroupChat, addToGroup, removeFromGroup, leaveGroup };
