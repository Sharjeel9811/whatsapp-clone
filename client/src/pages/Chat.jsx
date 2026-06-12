import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useThemeMode } from '../context/ThemeContext';
import API from '../utils/axios';
import {
  Box, Avatar, Typography, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent,
  TextField, Button, Badge, List, ListItem, ListItemAvatar, ListItemText,
  AppBar, Toolbar, Drawer, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Logout, Menu as MenuIcon, Chat as ChatIcon, Notifications, Check, PhotoCamera,
  DarkMode, LightMode, Close as CloseIcon, Lock,
} from '@mui/icons-material';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';

const Chat = () => {
  const { user, logout, updateUser } = useAuth();
  const { socket, onlineUsers, onlineMap } = useSocket();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(true);

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [notifList, setNotifList] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileDialog, setProfileDialog] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);
  const [notifDrawer, setNotifDrawer] = useState(false);
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(user?.profilePic || '');
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [typing, setTyping] = useState(false);
  const [viewUserProfile, setViewUserProfile] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [editMsg, setEditMsg] = useState(null);
  const [readChatIds, setReadChatIds] = useState(new Set());
  const [forwardDialog, setForwardDialog] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [msgInfo, setMsgInfo] = useState(null);

  const fetchChats = useCallback(async () => { try { const { data } = await API.get('/chats'); setChats(data); } catch {} }, []);
  const fetchFriends = useCallback(async () => { try { const { data } = await API.get('/friends'); setFriends(data); } catch {} }, []);
  const fetchFriendRequests = useCallback(async () => { try { const { data } = await API.get('/friends/requests'); setFriendRequests(data); } catch {} }, []);
  const fetchNotifications = useCallback(async () => {
    try { const { data } = await API.get('/notifications'); setNotifList(data); setNotifCount(data.filter((n) => !n.read).length); } catch {}
  }, []);
  const fetchBlockedUsers = useCallback(async () => {
    try { const { data } = await API.get('/users/blocked'); setBlockedUsers(data); } catch {}
  }, []);

  useEffect(() => { fetchChats(); fetchFriends(); fetchFriendRequests(); fetchNotifications(); fetchBlockedUsers(); }, []);

  useEffect(() => {
    if (!selectedChat) return;
    const updated = chats.find((c) => c._id === selectedChat._id);
    if (updated) setSelectedChat(updated);
  }, [chats]);

  useEffect(() => {
    const poll = setInterval(() => {
      fetchFriendRequests();
      fetchNotifications();
      fetchChats();
      fetchFriends();
    }, 10000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    let initial = true;
    const poll = setInterval(async () => {
      try {
        const { data } = await API.get(`/messages/${selectedChat._id}`);
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const newMsgs = data.filter((m) => !existingIds.has(m._id));
          if (newMsgs.length === 0) return prev;
          if (!initial) {
            const last = newMsgs[newMsgs.length - 1];
            toast(`New message from ${last?.sender?.fullName || 'someone'}`, { icon: '💬', duration: 3000 });
          }
          return [...prev, ...newMsgs];
        });
        initial = false;
      } catch {}
    }, 2000);
    return () => { clearInterval(poll); initial = true; };
  }, [selectedChat]);

  useEffect(() => {
    if (!socket) return;

    const onMsg = (m) => {
      setMessages((p) => (p.some((x) => x._id === m._id) ? p : [...p, m]));
      fetchChats();
      if (socket) {
        socket.emit('message-delivered', { messageIds: [m._id], userId: user._id });
      }
      if (selectedChat?._id !== m.chat?._id) {
        fetchNotifications();
        toast(`New message from ${m.sender?.fullName || 'someone'}`, { icon: '💬' });
      }
    };

    const onReq = (data) => {
      fetchFriendRequests();
      fetchNotifications();
      toast(`${data.senderName || 'Someone'} sent you a friend request`, { icon: '👤', duration: 6000 });
    };

    const onAccept = (data) => {
      fetchFriends();
      fetchFriendRequests();
      fetchNotifications();
      toast(`${data.receiverName || 'Someone'} accepted your friend request`, { icon: '✅', duration: 6000 });
    };

    const onOnline = ({ userId }) => {
      if (userId !== user._id) toast('User came online', { icon: '🟢', duration: 2000 });
    };

    socket.on('message-received', onMsg);
    socket.on('friend-request-received', onReq);
    socket.on('friend-request-accepted-notification', onAccept);
    socket.on('user-online', onOnline);

    socket.on('message-reacted', ({ messageId, reactions }) => {
      setMessages((p) => p.map((m) => m._id === messageId ? { ...m, reactions } : m));
    });

    socket.on('message-edited', ({ messageId, content, edited, editedAt }) => {
      setMessages((p) => p.map((m) => m._id === messageId ? { ...m, content, edited, editedAt } : m));
    });

    socket.on('message-delivered-update', ({ messageId, deliveredTo }) => {
      setMessages((p) => p.map((m) => m._id === messageId ? { ...m, deliveredTo } : m));
    });

    socket.on('message-read-update', ({ messageIds }) => {
      setMessages((p) => p.map((m) => messageIds.includes(m._id) ? { ...m, readBy: [...(m.readBy || []), user._id].filter((v, i, a) => a.indexOf(v) === i) } : m));
    });

    socket.on('message-deleted', ({ messageId }) => {
      setMessages((p) => p.map((m) => m._id === messageId ? { ...m, deleted: true, content: undefined, file: undefined, voice: undefined } : m));
    });

    socket.on('profile-updated', ({ userId, fullName, profilePic }) => {
      setChats((p) => p.map((c) => ({
        ...c,
        users: c.users.map((u) => u._id === userId ? { ...u, fullName, profilePic } : u),
      })));
      setFriends((p) => p.map((f) => f._id === userId ? { ...f, fullName, profilePic } : f));
    });

    socket.on('typing', ({ chatId }) => { if (selectedChat?._id === chatId) setTyping(true); });
    socket.on('stop-typing', ({ chatId }) => { if (selectedChat?._id === chatId) setTyping(false); });

    return () => {
      socket.off('message-received'); socket.off('friend-request-received');
      socket.off('friend-request-accepted-notification'); socket.off('user-online');
      socket.off('message-reacted'); socket.off('message-edited');
      socket.off('message-delivered-update'); socket.off('message-read-update'); socket.off('message-deleted');
      socket.off('profile-updated');
      socket.off('typing'); socket.off('stop-typing');
    };
  }, [socket, selectedChat, user._id]);

  const accessChat = async (userId) => {
    try {
      const { data } = await API.post('/chats', { userId });
      if (!chats.find((c) => c._id === data._id)) setChats((p) => [data, ...p]);
      setSelectedChat(data);
      fetchMessages(data._id);
    } catch {}
  };

  const fetchMessages = async (chatId) => {
    try {
      const { data } = await API.get(`/messages/${chatId}`);
      setMessages(data);
      if (chatId) {
        await API.put('/messages/read/mark', { chatId });
        socket.emit('message-read', { chatId, userId: user._id });
        fetchNotifications();
      }
    } catch {}
  };

  const sendMessage = async (content, replyToId) => {
    if (!selectedChat || !content.trim()) return;
    try {
      const body = { chatId: selectedChat._id, content };
      if (replyToId) body.replyTo = replyToId;
      const { data } = await API.post('/messages', body);
      setMessages((p) => [...p, data]);
      if (socket) socket.emit('new-message', data);
      fetchChats();
      setReplyToMsg(null);
    } catch {}
  };

  const sendFileMessage = async (file, replyToId) => {
    if (!selectedChat || !file) return;
    try {
      const fd = new FormData();
      fd.append('chatId', selectedChat._id);
      const fileName = file.name || (file.type?.startsWith('audio/') ? `voice-${Date.now()}.webm` : 'file');
      fd.append('file', file, fileName);
      if (replyToId) fd.append('replyTo', replyToId);
      const { data } = await API.post('/messages', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessages((p) => [...p, data]);
      if (socket) socket.emit('new-message', data);
      fetchChats();
      setReplyToMsg(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send file');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const { data } = await API.delete(`/messages/${messageId}`);
      setMessages((p) => p.map((m) => m._id === messageId ? { ...m, ...data } : m));
      socket.emit('message-deleted', { messageId, chatId: data.chat?._id || data.chat, deleted: true });
    } catch {}
  };

  const reactToMessage = async (messageId, emoji) => {
    try {
      const { data } = await API.put(`/messages/${messageId}/react`, { emoji });
      setMessages((p) => p.map((m) => m._id === messageId ? data : m));
      socket.emit('message-reacted', { messageId, reactions: data.reactions, chatId: selectedChat?._id });
    } catch {}
  };

  const editMessage = async (messageId, content) => {
    try {
      const { data } = await API.put(`/messages/${messageId}/edit`, { content });
      setMessages((p) => p.map((m) => m._id === messageId ? data : m));
      socket.emit('message-edited', { messageId, content: data.content, edited: true, editedAt: data.editedAt, chatId: selectedChat?._id });
      setEditMsg(null);
    } catch {}
  };

  const forwardMessage = async (messageId, targetChatId) => {
    try {
      const { data } = await API.post('/messages/forward', { messageId, targetChatId });
      socket.emit('message-forwarded', { ...data, chatId: targetChatId });
      toast('Message forwarded!', { icon: '↪️' });
      setForwardDialog(false);
      setForwardMsg(null);
    } catch {}
  };

  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      toast('Copied to clipboard', { icon: '📋' });
    } catch {}
  };

  const handleSendRequest = async (receiverId, receiverName) => {
    try {
      await API.post('/friends/request', { receiverId });
      socket.emit('send-friend-request', { receiverId, senderName: user.fullName, senderId: user._id });
      fetchFriendRequests();
      toast('Friend request sent!', { icon: '📨' });
    } catch {}
  };

  const handleAcceptRequest = async (requestId, senderId) => {
    try {
      const { data } = await API.put('/friends/accept', { requestId });
      socket.emit('friend-request-accepted', { senderId, receiverName: user.fullName });
      fetchFriends(); fetchFriendRequests();
      toast('Friend request accepted!', { icon: '✅' });
    } catch {}
  };

  const handleRejectRequest = async (requestId) => { try { await API.put('/friends/reject', { requestId }); fetchFriendRequests(); } catch {} };
  const handleRemoveFriend = async (friendId) => { try { await API.delete('/friends', { data: { friendId } }); fetchFriends(); } catch {} };

  const handleCreateGroup = async () => {
    if (!groupName || selectedFriends.length < 2) return;
    try { const { data } = await API.post('/chats/group', { chatName: groupName, users: selectedFriends }); setChats((p) => [data, ...p]); setGroupDialog(false); setGroupName(''); setSelectedFriends([]); toast('Group created!', { icon: '👥' }); } catch {}
  };

  const handleAddToGroup = async (chatId, userId) => { try { const { data } = await API.put('/chats/group/add', { chatId, userId }); setSelectedChat(data); fetchChats(); } catch {} };
  const handleRemoveFromGroup = async (chatId, userId) => { try { const { data } = await API.put('/chats/group/remove', { chatId, userId }); setSelectedChat(data); fetchChats(); } catch {} };
  const handleLeaveGroup = async (chatId) => { try { await API.put('/chats/group/leave', { chatId }); setSelectedChat(null); fetchChats(); } catch {} };

  const handleUpdateProfile = async () => {
    try {
      const fd = new FormData(); fd.append('fullName', profileName); if (profileFile) fd.append('profilePic', profileFile);
      const { data } = await API.put('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ ...user, fullName: profileName, profilePic: data.profilePic }); setProfileDialog(false);
      toast('Profile updated!', { icon: '✅' });
    } catch {}
  };

  const handleLogout = async () => { setAnchorEl(null); await logout(); };

  const handleNotifClick = async (n) => {
    if (n.data?.senderId) accessChat(n.data.senderId);
    else if (n.data?.userId) accessChat(n.data.userId);
    else if (n.data?.chatId) { const c = chats.find((x) => x._id === n.data.chatId); if (c) setSelectedChat(c); }
    try { await API.put('/notifications/read', { notificationId: n._id }); fetchNotifications(); } catch {}
  };

  const handleViewUserProfile = async (userId) => {
    try { const { data } = await API.get(`/users/profile/${userId}`); setViewUserProfile(data); } catch {}
  };

  const handleBlockUser = async (userId) => {
    try {
      await API.post(`/users/block/${userId}`);
      toast('User blocked', { icon: '🚫' });
      setViewUserProfile((p) => ({ ...p, isBlocked: true }));
      fetchBlockedUsers(); fetchFriends();
    } catch {}
  };

  const handleUnblockUser = async (userId) => {
    try {
      await API.post(`/users/unblock/${userId}`);
      toast('User unblocked', { icon: '✅' });
      setViewUserProfile((p) => ({ ...p, isBlocked: false }));
      fetchBlockedUsers();
    } catch {}
  };

  const handleOpenForward = (msg) => { setForwardMsg(msg); setForwardDialog(true); };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column',
      '& ::-webkit-scrollbar': { width: 6, height: 6 },
      '& ::-webkit-scrollbar-track': { bgcolor: 'transparent' },
      '& ::-webkit-scrollbar-thumb': { bgcolor: mode === 'dark' ? '#374045' : '#c1c1c1', borderRadius: 3 },
    }}>
      <AppBar position="static" sx={{ bgcolor: mode === 'dark' ? '#202c33' : '#075e54' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MenuIcon />
          </IconButton>
          <Avatar src={user?.profilePic} sx={{ width: 36, height: 36, ml: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1.5, fontWeight: 500 }}>WhatsApp</Typography>
          <IconButton color="inherit" onClick={() => { fetchNotifications(); setNotifDrawer(true); }}>
            <Badge badgeContent={notifCount} color="error"><Notifications /></Badge>
          </IconButton>
          <IconButton color="inherit" onClick={toggleTheme} sx={{ ml: 0.5 }}>
            {mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); setProfileDialog(true); setProfileName(user?.fullName || ''); setProfilePreview(user?.profilePic || ''); setProfileFile(null); }}>
          <Avatar src={user?.profilePic} sx={{ width: 28, height: 28, mr: 1.5 }} /> Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}><Logout sx={{ mr: 1.5 }} /> Logout</MenuItem>
      </Menu>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ display: isMobile ? (mobileOpen ? 'flex' : 'none') : 'flex', width: isMobile ? '100%' : 'auto', flex: isMobile ? 1 : 'unset' }}>
          <ChatSidebar
            chats={chats} selectedChat={selectedChat}
            onSelectChat={(chat) => { setSelectedChat(chat); fetchMessages(chat._id); setReadChatIds((p) => new Set(p).add(chat._id)); if (isMobile) setMobileOpen(false); }}
            onAccessChat={accessChat} friends={friends} friendRequests={friendRequests}
            onSendRequest={handleSendRequest} onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest} onRemoveFriend={handleRemoveFriend}
            onOpenGroup={() => setGroupDialog(true)} onlineUsers={onlineUsers} readChatIds={readChatIds}
          />
        </Box>

        {selectedChat ? (
          <Box sx={{ display: isMobile ? (!mobileOpen ? 'flex' : 'none') : 'flex', flex: 1, width: '100%' }}>
            <ChatWindow chat={selectedChat} messages={messages} onSendMessage={sendMessage}
              onSendFile={sendFileMessage} onDeleteMessage={deleteMessage} onReactToMessage={reactToMessage}
              onEditMessage={editMessage} onCopyMessage={handleCopyMessage} onForwardMessage={handleOpenForward}
              onAddToGroup={handleAddToGroup} onRemoveFromGroup={handleRemoveFromGroup}
              onLeaveGroup={handleLeaveGroup} friends={friends} typing={typing} socket={socket}
              onlineUsers={onlineUsers} onlineMap={onlineMap} onViewUserProfile={handleViewUserProfile}
              replyToMsg={replyToMsg} setReplyToMsg={setReplyToMsg}
              editMsg={editMsg} setEditMsg={setEditMsg}
              msgInfo={msgInfo} setMsgInfo={setMsgInfo}
              onBack={() => setMobileOpen(true)} />
          </Box>
        ) : (
          <Box sx={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'text.secondary', flexDirection: 'column', gap: 2,
            bgcolor: mode === 'dark' ? '#0b141a' : '#eae6df',
            backgroundImage: mode === 'dark'
              ? 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23182129\' fill-opacity=\'0.6\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              : 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d1d7db\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}>
            <Box sx={{
              width: 320, textAlign: 'center', p: 4, borderRadius: 3,
              bgcolor: mode === 'dark' ? 'rgba(17,27,33,0.85)' : 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
            }}>
              <ChatIcon sx={{ fontSize: 80, color: '#25D366', mb: 2, opacity: 0.7 }} />
              <Typography variant="h5" sx={{ fontWeight: 300, color: mode === 'dark' ? '#e9edef' : '#41525d', mb: 1 }}>
                WhatsApp
              </Typography>
              <Typography variant="body2" sx={{ color: '#667781', lineHeight: 1.6 }}>
                Send and receive messages, voice messages, and files. Stay connected with your friends and groups.
              </Typography>
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ color: '#8696a0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Lock sx={{ fontSize: 14 }} /> Messages are end-to-end encrypted
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog open={profileDialog} onClose={() => setProfileDialog(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>Profile</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', px: 4, pb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <label htmlFor="profile-upload-chat">
              <Avatar src={profilePreview} sx={{ width: 100, height: 100, cursor: 'pointer', border: '3px solid', borderColor: 'divider' }} />
              <PhotoCamera sx={{ position: 'relative', top: -32, left: 35, color: '#25D366', bgcolor: 'background.paper', borderRadius: '50%', p: 0.5, fontSize: 20 }} />
            </label>
            <input id="profile-upload-chat" type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; if (f) { setProfileFile(f); setProfilePreview(URL.createObjectURL(f)); } }} />
          </Box>
          <TextField fullWidth label="Full Name" value={profileName} onChange={(e) => setProfileName(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>@{user?.username}</Typography>
          <Button fullWidth variant="contained" sx={{ mt: 2, borderRadius: 2, bgcolor: '#25D366', fontWeight: 600, '&:hover': { bgcolor: '#20bd5a' } }}
            onClick={handleUpdateProfile}>Save</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Create Group</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <Typography sx={{ mt: 2, mb: 1, fontWeight: 500 }}>Select Members (at least 2):</Typography>
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {friends.map((f) => (
              <ListItem key={f._id} sx={{ borderRadius: 2, mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => setSelectedFriends((p) => p.includes(f._id) ? p.filter((id) => id !== f._id) : [...p, f._id])}>
                <ListItemAvatar><Avatar src={f.profilePic} /></ListItemAvatar>
                <ListItemText primary={f.fullName} secondary={`@${f.username}`} />
                {selectedFriends.includes(f._id) && <Check sx={{ color: '#25D366' }} />}
              </ListItem>
            ))}
          </List>
          <Button fullWidth variant="contained" sx={{ mt: 2, borderRadius: 2, bgcolor: '#25D366', fontWeight: 600, '&:hover': { bgcolor: '#20bd5a' } }}
            onClick={handleCreateGroup} disabled={!groupName || selectedFriends.length < 2}>Create Group</Button>
        </DialogContent>
      </Dialog>

      <Drawer anchor="right" open={notifDrawer} onClose={() => setNotifDrawer(false)} PaperProps={{ sx: { width: 380, maxWidth: '100%' } }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ flex: 1 }}>Notifications</Typography>
          <IconButton onClick={() => setNotifDrawer(false)}><CloseIcon /></IconButton>
        </Box>
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {notifList.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No notifications yet</Box>
          ) : (
            notifList.map((n) => (
              <ListItem key={n._id} button onClick={() => { handleNotifClick(n); setNotifDrawer(false); }}
                sx={{ bgcolor: n.read ? 'transparent' : 'action.hover', borderRadius: 1, mb: 0.5 }}>
                <ListItemText primary={n.message} secondary={new Date(n.createdAt).toLocaleString()}
                  primaryTypographyProps={{ fontWeight: n.read ? 400 : 600 }} />
              </ListItem>
            ))
          )}
        </List>
      </Drawer>

      <Dialog open={Boolean(viewUserProfile)} onClose={() => setViewUserProfile(null)} PaperProps={{ sx: { borderRadius: 3, minWidth: 350, textAlign: 'center' } }}>
        {viewUserProfile && (
          <>
            <DialogTitle sx={{ pb: 0 }}>User Info</DialogTitle>
            <DialogContent sx={{ px: 4, pb: 3 }}>
              <Avatar src={viewUserProfile.profilePic} sx={{ width: 100, height: 100, mx: 'auto', my: 2 }} />
              <Typography variant="h6">{viewUserProfile.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">@{viewUserProfile.username}</Typography>
              {viewUserProfile.isBlocked ? (
                <Button fullWidth variant="outlined" sx={{ mt: 2, borderRadius: 2, borderColor: '#25D366', color: '#25D366', fontWeight: 600 }}
                  onClick={() => handleUnblockUser(viewUserProfile._id)}>Unblock User</Button>
              ) : (
                <Button fullWidth variant="outlined" sx={{ mt: 2, borderRadius: 2, borderColor: '#ef5350', color: '#ef5350', fontWeight: 600, '&:hover': { bgcolor: '#ffebee' } }}
                  onClick={() => handleBlockUser(viewUserProfile._id)}>Block User</Button>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      <Dialog open={forwardDialog} onClose={() => setForwardDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Forward Message</DialogTitle>
        <DialogContent>
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {chats.filter((c) => c._id !== selectedChat?._id).map((c) => {
              const name = c.isGroupChat ? c.chatName : c.users?.find((u) => u._id !== user._id)?.fullName || 'Unknown';
              const avatar = c.isGroupChat ? '' : c.users?.find((u) => u._id !== user._id)?.profilePic || '';
              return (
                <ListItem key={c._id} button onClick={() => { if (forwardMsg) forwardMessage(forwardMsg._id, c._id); }}
                  sx={{ borderRadius: 2, mb: 0.5 }}>
                  <ListItemAvatar><Avatar src={avatar}>{!avatar && name[0]}</Avatar></ListItemAvatar>
                  <ListItemText primary={name} secondary={c.isGroupChat ? 'Group' : ''} />
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(msgInfo)} onClose={() => setMsgInfo(null)} PaperProps={{ sx: { borderRadius: 3, minWidth: 320 } }}>
        {msgInfo && (
          <>
            <DialogTitle>Message Info</DialogTitle>
            <DialogContent sx={{ pb: 3 }}>
              <Typography variant="body2" color="text.secondary">Sent: {new Date(msgInfo.createdAt).toLocaleString()}</Typography>
              {msgInfo.edited && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Edited: {new Date(msgInfo.editedAt).toLocaleString()}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Read by: {msgInfo.readBy?.length > 0 ? msgInfo.readBy.map((r) => r.fullName || r).join(', ') : 'No one yet'}
              </Typography>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Chat;
