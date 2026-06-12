import fs from 'fs';
import path from 'path';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Upload from '../models/Upload.js';

const sendMessage = async (req, res) => {
  try {
    const { chatId, content, replyTo } = req.body;
    let file = null;
    if (req.file) {
      const data = fs.readFileSync(req.file.path);
      const uploaded = await Upload.create({ data, mimetype: req.file.mimetype, filename: req.file.originalname });
      file = { url: `/api/file/${uploaded._id}`, type: req.file.mimetype, name: req.file.originalname };
    }
    if (!chatId || (!content && !file)) return res.status(400).json({ message: 'ChatId and content or file are required' });
    let messageObj = { sender: req.user._id, chat: chatId, readBy: [req.user._id], deliveredTo: [req.user._id] };
    if (content) messageObj.content = content;
    if (file) messageObj.file = file;
    if (replyTo) messageObj.replyTo = replyTo;
    let message = await Message.create(messageObj);
    message = await message.populate('sender', 'fullName username profilePic');
    if (replyTo) message = await message.populate({ path: 'replyTo', populate: { path: 'sender', select: 'fullName' } });
    message = await message.populate('chat');
    message = await User.populate(message, { path: 'chat.users', select: 'fullName username profilePic email' });
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });
    res.status(201).json(message);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'fullName username profilePic')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'fullName' } })
      .populate('reactions.user', 'fullName username profilePic').populate('chat').sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Can only delete your own messages' });
    message.deleted = true;
    message.content = undefined;
    message.file = undefined;
    message.voice = undefined;
    await message.save();
    const updated = await Message.findById(message._id).populate('sender', 'fullName username profilePic').populate({ path: 'replyTo', populate: { path: 'sender', select: 'fullName' } });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    const existingReaction = message.reactions.find((r) => r.user.toString() === req.user._id.toString());
    if (existingReaction) {
      if (existingReaction.emoji === emoji) message.reactions = message.reactions.filter((r) => r.user.toString() !== req.user._id.toString());
      else existingReaction.emoji = emoji;
    } else message.reactions.push({ emoji, user: req.user._id });
    await message.save();
    const updated = await Message.findById(message._id).populate('reactions.user', 'fullName username profilePic');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Can only edit your own messages' });
    if (!content) return res.status(400).json({ message: 'Content is required' });
    message.content = content;
    message.edited = true;
    message.editedAt = Date.now();
    await message.save();
    const updated = await Message.findById(message._id).populate('sender', 'fullName username profilePic').populate({ path: 'replyTo', populate: { path: 'sender', select: 'fullName' } });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const forwardMessage = async (req, res) => {
  try {
    const { messageId, targetChatId } = req.body;
    const original = await Message.findById(messageId);
    if (!original) return res.status(404).json({ message: 'Message not found' });
    const newMsg = await Message.create({ chat: targetChatId, sender: req.user._id, content: original.content, file: original.file, readBy: [req.user._id], deliveredTo: [req.user._id] });
    let populated = await Message.findById(newMsg._id).populate('sender', 'fullName username profilePic');
    populated = await User.populate(populated, { path: 'chat.users', select: 'fullName username profilePic email' });
    await Chat.findByIdAndUpdate(targetChatId, { latestMessage: newMsg._id });
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markAsDelivered = async (req, res) => {
  try {
    const { messageIds } = req.body;
    await Message.updateMany({ _id: { $in: messageIds }, deliveredTo: { $ne: req.user._id } }, { $push: { deliveredTo: req.user._id } });
    const updated = await Message.find({ _id: { $in: messageIds } }).select('_id deliveredTo readBy');
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    await Message.updateMany({ chat: chatId, readBy: { $ne: req.user._id } }, { $push: { readBy: req.user._id, deliveredTo: req.user._id } });
    await Notification.deleteMany({ user: req.user._id, 'data.chatId': chatId });
    const chat = await Chat.findById(chatId);
    if (chat) {
      const otherUsers = chat.users.filter((u) => u.toString() !== req.user._id.toString());
      for (const uid of otherUsers) await Notification.deleteMany({ user: uid, type: { $in: ['friend_request', 'friend_accepted'] } });
    }
    const otherUserId = chat ? chat.users.find((u) => u.toString() !== req.user._id.toString()) : null;
    if (otherUserId) await Notification.deleteMany({ user: req.user._id, $or: [{ 'data.senderId': otherUserId.toString() }, { 'data.userId': otherUserId.toString() }] });
    res.json({ message: 'Messages marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export { sendMessage, allMessages, deleteMessage, reactToMessage, editMessage, forwardMessage, markAsDelivered, markAsRead };
