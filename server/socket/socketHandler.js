import User from '../models/User.js';
import Message from '../models/Message.js';

const setupSocket = (io) => {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('setup', async (userId) => {
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      socket.join(userId);
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: Date.now() }).exec();
      socket.broadcast.emit('user-online', { userId });
      try {
        const undelivered = await Message.find({ deliveredTo: { $ne: userId }, chat: { $exists: true } }).populate('chat', 'users');
        const toUpdate = undelivered.filter((m) => m.chat && m.chat.users && m.chat.users.some((u) => (u._id || u).toString() === userId));
        const ids = toUpdate.map((m) => m._id);
        if (ids.length > 0) {
          await Message.updateMany({ _id: { $in: ids } }, { $push: { deliveredTo: userId } });
          for (const msg of toUpdate) {
            const senderId = msg.sender.toString();
            const senderSocket = onlineUsers.get(senderId);
            if (senderSocket && senderId !== userId) io.to(senderSocket).emit('message-delivered-update', { messageId: msg._id, deliveredTo: [...msg.deliveredTo.map((id) => id.toString()), userId] });
          }
        }
      } catch (err) { console.error('Error marking messages as delivered:', err.message); }
    });

    socket.on('join-chat', (chatId) => socket.join(chatId));
    socket.on('typing', (chatId) => socket.to(chatId).emit('typing', { chatId, userId: socket.userId }));
    socket.on('stop-typing', (chatId) => socket.to(chatId).emit('stop-typing', { chatId, userId: socket.userId }));

    socket.on('new-message', (message) => {
      const chat = message.chat;
      if (!chat || !chat.users) return;
      chat.users.forEach((user) => {
        const userId = (user._id || user).toString();
        if (userId !== message.sender._id.toString()) io.to(userId).emit('message-received', message);
      });
    });

    socket.on('message-delivered', async (data) => {
      const { messageIds, userId } = data;
      if (!messageIds || !userId) return;
      try {
        await Message.updateMany({ _id: { $in: messageIds }, deliveredTo: { $ne: userId } }, { $push: { deliveredTo: userId } });
        const updated = await Message.find({ _id: { $in: messageIds } }).select('_id deliveredTo');
        for (const msg of updated) {
          const msgFull = await Message.findById(msg._id).populate('chat', 'users');
          if (msgFull && msgFull.chat) socket.to(msgFull.chat._id.toString()).emit('message-delivered-update', { messageId: msg._id, deliveredTo: msg.deliveredTo });
        }
      } catch (err) { console.error('Error marking delivered:', err.message); }
    });

    socket.on('message-read', async (data) => {
      const { chatId, userId } = data;
      if (!chatId || !userId) return;
      try {
        const updated = await Message.find({ chat: chatId, readBy: { $ne: userId } }).select('_id');
        const ids = updated.map((m) => m._id);
        if (ids.length > 0) {
          await Message.updateMany({ _id: { $in: ids } }, { $push: { readBy: userId, deliveredTo: userId } });
          socket.to(chatId).emit('message-read-update', { chatId, userId, messageIds: ids });
        }
      } catch (err) { console.error('Error marking read:', err.message); }
    });

    socket.on('message-reacted', (data) => { if (data.chatId) socket.to(data.chatId).emit('message-reacted', data); });
    socket.on('message-edited', (data) => { if (data.chatId) socket.to(data.chatId).emit('message-edited', data); });
    socket.on('message-forwarded', (data) => { if (data.chatId) socket.to(data.chatId).emit('message-received', data); });
    socket.on('message-deleted', (data) => { if (data.chatId) socket.to(data.chatId).emit('message-deleted', data); });

    socket.on('send-friend-request', (data) => {
      const receiverSocket = onlineUsers.get(data.receiverId);
      if (receiverSocket) io.to(receiverSocket).emit('friend-request-received', data);
    });

    socket.on('friend-request-accepted', (data) => {
      const senderSocket = onlineUsers.get(data.senderId);
      if (senderSocket) io.to(senderSocket).emit('friend-request-accepted-notification', data);
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: Date.now() }).exec();
        socket.broadcast.emit('user-offline', { userId: socket.userId });
      }
    });
  });
};

export default setupSocket;
