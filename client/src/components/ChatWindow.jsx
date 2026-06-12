import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import {
  Box, TextField, IconButton, Typography, Avatar, Badge, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, ListItemText, Button, alpha, Tooltip, Popover, LinearProgress, Divider,
} from '@mui/material';
import {
  Send, Delete, MoreVert, PersonAdd, PersonRemove, ExitToApp, AttachFile, EmojiEmotions,
  Reply as ReplyIcon, ContentCopy, Edit as EditIcon, Info as InfoIcon, Forward as ForwardIcon,
  Mic, MicOff, Check, CheckCircle, FiberManualRecord, Close, ArrowBack,
} from '@mui/icons-material';
import { API_URL } from '../utils/config';

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const ChatWindow = ({
  chat, messages, onSendMessage, onSendFile, onDeleteMessage, onReactToMessage,
  onEditMessage, onCopyMessage, onForwardMessage,
  onAddToGroup, onRemoveFromGroup, onLeaveGroup, friends, typing, socket, onlineUsers, onlineMap,
  onViewUserProfile, replyToMsg, setReplyToMsg, editMsg, setEditMsg, msgInfo, setMsgInfo, onBack,
}) => {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const [message, setMessage] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [msgMenuAnchor, setMsgMenuAnchor] = useState(null);
  const [activeMsgId, setActiveMsgId] = useState(null);
  const [reactPickerAnchor, setReactPickerAnchor] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const audioRef = useRef(null);
  const msgContainerRef = useRef(null);
  const isDark = mode === 'dark';

  const isGroup = chat?.isGroupChat;
  const otherUser = isGroup ? null : chat?.users?.find((u) => u._id !== user._id);
  const chatName = isGroup ? chat.chatName : (otherUser?.fullName || 'Unknown');
  const chatAvatar = isGroup ? '' : (otherUser?.profilePic || '');
  const isOnline = otherUser ? onlineUsers.includes(otherUser._id) : false;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (socket && chat) socket.emit('join-chat', chat._id); }, [socket, chat]);

  const handleSend = () => {
    if (!message.trim() && !audioBlob) return;
    if (audioBlob) {
      onSendFile(audioBlob, replyToMsg?._id);
      setAudioBlob(null);
      setRecordingDuration(0);
    }
    if (message.trim()) {
      onSendMessage(message, replyToMsg?._id);
      setMessage('');
    }
    if (socket) socket.emit('stop-typing', chat._id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTyping = () => {
    if (!socket) return;
    socket.emit('typing', chat._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit('stop-typing', chat._id), 2000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) onSendFile(file, replyToMsg?._id);
    e.target.value = '';
    setReplyToMsg(null);
  };

  const handleMsgMenuOpen = (e, msgId) => {
    setMsgMenuAnchor(e.currentTarget);
    setActiveMsgId(msgId);
  };

  const handleMsgMenuClose = () => {
    setMsgMenuAnchor(null);
    setActiveMsgId(null);
  };

  const handleReactClick = () => {
    setReactPickerAnchor(msgMenuAnchor);
    setMsgMenuAnchor(null);
  };

  const handleEmojiPick = (emoji) => {
    if (activeMsgId) onReactToMessage(activeMsgId, emoji);
    setReactPickerAnchor(null);
    setActiveMsgId(null);
  };

  const handleDeleteFromMenu = () => {
    if (activeMsgId) onDeleteMessage(activeMsgId);
    handleMsgMenuClose();
  };

  const handleReplyClick = () => {
    const msg = messages.find((m) => m._id === activeMsgId);
    if (msg) setReplyToMsg(msg);
    handleMsgMenuClose();
  };

  const handleEditClick = () => {
    const msg = messages.find((m) => m._id === activeMsgId);
    if (msg) { setEditValue(msg.content || ''); setEditMsg(msg); }
    handleMsgMenuClose();
  };

  const handleEditSave = () => {
    if (editMsg && editValue.trim()) {
      onEditMessage(editMsg._id, editValue);
    }
  };

  const handleCopyClick = () => {
    const msg = messages.find((m) => m._id === activeMsgId);
    if (msg?.content) onCopyMessage(msg.content);
    handleMsgMenuClose();
  };

  const handleForwardClick = () => {
    const msg = messages.find((m) => m._id === activeMsgId);
    if (msg) onForwardMessage(msg);
    handleMsgMenuClose();
  };

  const handleInfoClick = () => {
    const msg = messages.find((m) => m._id === activeMsgId);
    if (msg) setMsgInfo(msg);
    handleMsgMenuClose();
  };

  const activeMsg = activeMsgId ? messages.find((m) => m._id === activeMsgId) : null;
  const isOwnActive = activeMsg?.sender?._id === user._id;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      let startTime = Date.now();
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
      setRecordingDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch {}
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlayAudio = (url) => {
    if (playingAudio === url) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(`${API_URL}${url}`);
      audioRef.current = audio;
      audio.onended = () => setPlayingAudio(null);
      audio.play();
      setPlayingAudio(url);
    }
  };

  const getMessageStatus = (msg) => {
    if (!msg.sender?._id || msg.sender._id !== user._id) return null;
    const otherUsers = chat?.users?.filter((u) => u._id !== user._id) || [];
    const allRead = otherUsers.every((u) => msg.readBy?.some((r) => (r._id || r).toString() === u._id.toString()));
    const allDelivered = otherUsers.every((u) => msg.deliveredTo?.some((d) => (d._id || d).toString() === u._id.toString()));
    if (allRead) return 'read';
    if (allDelivered) return 'delivered';
    return 'sent';
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatLastSeen = (date) => {
    const d = new Date(date);
    const now = new Date();
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    if (d.toDateString() === now.toDateString()) return `last seen today at ${time}`;
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return `last seen yesterday at ${time}`;
    return `last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
  };

  const showDateSeparator = (msg, idx) => {
    if (idx === 0) return true;
    return new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();
  };

  const isOwnMessage = (msg) => msg.sender?._id === user._id;
  const groupMembers = chat?.users || [];
  const nonMemberFriends = friends.filter((f) => !groupMembers.some((m) => m._id === f._id));

  const chatBg = isDark ? '#0b141a' : '#efeae2';
  const headerBg = isDark ? '#202c33' : '#f0f2f5';
  const sentBg = '#005c4b';
  const receivedBg = isDark ? '#202c33' : '#ffffff';
  const textColor = isDark ? '#e9edef' : '#111b21';
  const inputBg = isDark ? '#2a3942' : '#ffffff';
  const borderColor = isDark ? '#313d45' : '#e9edef';
  const sentTail = 'polygon(0 0, 92% 0, 100% 8px, 100% 100%, 0 100%)';
  const receivedTail = 'polygon(8% 0, 100% 0, 100% 100%, 0 100%, 0 8px)';

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: chatBg, minWidth: 0 }}>
      <Box sx={{ p: 1.5, px: 2, bgcolor: headerBg, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor }}>
        {onBack && (
          <IconButton onClick={onBack} sx={{ mr: 0.5, display: { md: 'none' }, color: textColor }}>
            <ArrowBack />
          </IconButton>
        )}
        <Badge overlap="circular" variant="dot" color={isOnline ? 'success' : 'default'}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Avatar src={chatAvatar} sx={{ width: 40, height: 40, cursor: otherUser ? 'pointer' : 'default' }}
            onClick={() => { if (otherUser) onViewUserProfile?.(otherUser._id); }}>
            {!chatAvatar && (isGroup ? chatName[0]?.toUpperCase() : '')}
          </Avatar>
        </Badge>
        <Box sx={{ ml: 2, flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: textColor, fontWeight: 500, cursor: otherUser ? 'pointer' : 'default', fontSize: 16 }}
            onClick={() => { if (otherUser) onViewUserProfile?.(otherUser._id); }}>
            {chatName}
          </Typography>
          <Typography variant="caption" sx={{ color: '#8696a0', fontSize: 12 }}>
            {typing ? (
              <Box component="span" sx={{ color: '#00a884', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                typing<span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
              </Box>
            ) : isGroup ? (
              `${groupMembers.length} members${(() => { const n = groupMembers.filter((m) => onlineUsers.includes(m._id)).length; return n > 0 ? `, ${n} online` : ''; })()}`
            ) : isOnline ? 'online' : formatLastSeen(onlineMap[otherUser?._id] || otherUser?.lastSeen)}
          </Typography>
        </Box>
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: '#8696a0' }}>
          <MoreVert />
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          {isGroup && (
            <div>
              <MenuItem onClick={() => { setAnchorEl(null); setAddMemberDialog(true); }}>
                <PersonAdd sx={{ mr: 1.5, fontSize: 20 }} /> Add Member
              </MenuItem>
              {groupMembers.filter((m) => m._id !== user._id).map((m) => (
                <MenuItem key={m._id} onClick={() => { setAnchorEl(null); onRemoveFromGroup(chat._id, m._id); }}>
                  <PersonRemove sx={{ mr: 1.5, fontSize: 20 }} /> Remove {m.fullName}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); onLeaveGroup(chat._id); }}>
                <ExitToApp sx={{ mr: 1.5, fontSize: 20 }} /> Leave Group
              </MenuItem>
            </div>
          )}
          {otherUser && (
            <MenuItem onClick={() => { setAnchorEl(null); onViewUserProfile?.(otherUser._id); }}>
              <Avatar src={otherUser.profilePic} sx={{ width: 24, height: 24, mr: 1.5 }} /> View Profile
            </MenuItem>
          )}
        </Menu>
      </Box>

      {editMsg && (
        <Box sx={{ bgcolor: isDark ? '#202c33' : '#f0f2f5', p: 1.5, px: 2, borderBottom: '1px solid', borderColor, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon sx={{ color: '#00a884', fontSize: 20 }} />
          <Typography variant="caption" sx={{ flex: 1, color: '#8696a0', fontSize: 13 }}>Editing message</Typography>
          <IconButton size="small" onClick={() => { setEditMsg(null); setEditValue(''); }} sx={{ color: '#8696a0' }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      )}

      <Box ref={msgContainerRef} sx={{
        flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column',
        backgroundImage: isDark
          ? 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23182129\' fill-opacity=\'0.6\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          : 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d1d7db\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        '&::-webkit-scrollbar-thumb': { bgcolor: isDark ? '#374045' : '#c1c1c1', borderRadius: 3 },
      }}>
        {editMsg ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Box sx={{ maxWidth: { xs: '85%', md: '65%' }, width: '100%' }}>
              <TextField fullWidth multiline maxRows={4} value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); } }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: inputBg, borderRadius: 3, color: textColor } }} />
              <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => { setEditMsg(null); setEditValue(''); }}
                  sx={{ color: '#8696a0', textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
                <Button size="small" variant="contained" onClick={handleEditSave}
                  sx={{ bgcolor: '#00a884', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#06cf9c' } }}>Save</Button>
              </Box>
            </Box>
          </Box>
        ) : (
          messages.map((msg, idx) => {
            const own = isOwnMessage(msg);
            const status = getMessageStatus(msg);
            const showName = isGroup && !own;

            if (msg.system) {
              return (
                <Box key={msg._id}>
                  {showDateSeparator(msg, idx) && (
                    <Box sx={{ textAlign: 'center', my: 1.5 }}>
                      <Typography variant="caption" sx={{ bgcolor: isDark ? '#182229' : '#e1f3fb', px: 2, py: 0.5, borderRadius: 2, color: isDark ? '#8696a0' : '#54656f', fontWeight: 500, fontSize: 12 }}>
                        {formatDate(msg.createdAt)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ textAlign: 'center', my: 1 }}>
                    <Typography variant="caption" sx={{ color: isDark ? '#8696a0' : '#667781', fontStyle: 'italic', fontSize: 12 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                </Box>
              );
            }

            return (
              <Box key={msg._id}>
                {showDateSeparator(msg, idx) && (
                  <Box sx={{ textAlign: 'center', my: 1.5 }}>
                    <Typography variant="caption" sx={{ bgcolor: isDark ? '#182229' : '#e1f3fb', px: 2, py: 0.5, borderRadius: 2, color: isDark ? '#8696a0' : '#54656f', fontWeight: 500, fontSize: 12 }}>
                      {formatDate(msg.createdAt)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{
                  display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', mb: 0.3,
                  position: 'relative', animation: 'fadeIn 0.2s ease-out',
                }}>
                  <Box sx={{
                    maxWidth: { xs: '85%', md: '65%' },
                    bgcolor: own ? sentBg : receivedBg,
                    color: own ? '#e9edef' : textColor,
                    p: 1.5,
                    borderRadius: 2,
                    position: 'relative',
                    wordBreak: 'break-word',
                    boxShadow: own ? 'none' : '0 1px 1px rgba(0,0,0,0.05)',
                    borderBottomRightRadius: own ? 0 : 2,
                    borderBottomLeftRadius: own ? 2 : 0,
                    clipPath: own ? sentTail : receivedTail,
                  }}>
                    {msg.replyTo && (
                      <Box sx={{ borderLeft: '3px solid #00a884', pl: 1, mb: 0.5, pb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#00a884', fontWeight: 600, display: 'block', fontSize: 11 }}>
                          {msg.replyTo.sender?.fullName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: own ? alpha('#fff', 0.7) : '#8696a0', fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {msg.replyTo.deleted ? 'This message was deleted' : (msg.replyTo.content || (msg.replyTo.file ? '📎 File' : ''))}
                        </Typography>
                      </Box>
                    )}

                    {showName && (
                      <Typography variant="caption" sx={{ color: '#00a884', fontWeight: 600, display: 'block', mb: 0.25, fontSize: 12 }}>
                        {msg.sender?.fullName}
                      </Typography>
                    )}

                    {msg.deleted ? (
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: own ? alpha('#fff', 0.5) : '#8696a0', fontSize: 13 }}>
                        This message was deleted
                      </Typography>
                    ) : msg.voice ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 220 }}>
                        <IconButton size="small" onClick={() => togglePlayAudio(msg.voice.url)}
                          sx={{ color: own ? '#e9edef' : '#00a884', bgcolor: own ? alpha('#fff', 0.1) : alpha('#00a884', 0.1), width: 36, height: 36 }}>
                          {playingAudio === msg.voice.url ? <FiberManualRecord sx={{ fontSize: 14 }} /> : <FiberManualRecord sx={{ fontSize: 14 }} />}
                        </IconButton>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress variant="determinate" value={0}
                            sx={{ bgcolor: own ? alpha('#fff', 0.2) : alpha('#00a884', 0.2), height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: own ? '#e9edef' : '#00a884' } }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: own ? alpha('#fff', 0.6) : '#8696a0', fontSize: 11, minWidth: 32 }}>
                          {formatDuration(msg.voice.duration || 0)}
                        </Typography>
                      </Box>
                    ) : msg.file ? (
                      msg.file.type.startsWith('image/') ? (
                        <Box component="img" src={`${API_URL}${msg.file.url}`} alt={msg.file.name}
                          onClick={() => setLightboxImg(`${API_URL}${msg.file.url}`)}
                          sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: 1, display: 'block', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.9 } }} />
                      ) : msg.file.type.startsWith('audio/') ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton size="small" onClick={() => togglePlayAudio(msg.file.url)}
                            sx={{ color: own ? '#e9edef' : '#00a884', bgcolor: own ? alpha('#fff', 0.1) : alpha('#00a884', 0.1), width: 36, height: 36 }}>
                            {playingAudio === msg.file.url ? <FiberManualRecord sx={{ fontSize: 14 }} /> : <FiberManualRecord sx={{ fontSize: 14 }} />}
                          </IconButton>
                          <Typography variant="body2" sx={{ color: own ? alpha('#fff', 0.7) : '#8696a0', fontSize: 13 }}>Voice message</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: own ? '#e9edef' : textColor }}>
                          <AttachFile sx={{ fontSize: 20 }} />
                          <Typography variant="body2" component="a" href={`${API_URL}${msg.file.url}`} target="_blank" rel="noopener"
                            sx={{ color: '#00a884', textDecoration: 'underline', fontSize: 13 }}>
                            {msg.file.name}
                          </Typography>
                        </Box>
                      )
                    ) : (
                      <Typography variant="body2" sx={{ lineHeight: 1.45, fontSize: 14 }}>{msg.content}</Typography>
                    )}

                    {msg.edited && !msg.deleted && (
                      <Typography variant="caption" sx={{ color: own ? alpha('#fff', 0.5) : '#8696a0', fontSize: 10, fontStyle: 'italic', display: 'block', mt: 0.2 }}>
                        edited
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.3, mt: 0.3 }}>
                      <Typography variant="caption" sx={{ color: own ? alpha('#fff', 0.6) : '#8696a0', fontSize: 10 }}>
                        {formatTime(msg.createdAt)}
                      </Typography>

                      {own && status && (
                        status === 'read' ? (
                          <Box sx={{ display: 'flex', gap: 0.2 }}>
                            <CheckCircle sx={{ fontSize: 12, color: '#53bdeb' }} />
                            <CheckCircle sx={{ fontSize: 12, color: '#53bdeb', ml: -0.6 }} />
                          </Box>
                        ) : status === 'delivered' ? (
                          <Box sx={{ display: 'flex', gap: 0.2 }}>
                            <Check sx={{ fontSize: 12, color: alpha('#fff', 0.6) }} />
                            <Check sx={{ fontSize: 12, color: alpha('#fff', 0.6), ml: -0.6 }} />
                          </Box>
                        ) : (
                          <Check sx={{ fontSize: 12, color: alpha('#fff', 0.5) }} />
                        )
                      )}

                      {!msg.deleted && (
                        <IconButton size="small" onClick={(e) => handleMsgMenuOpen(e, msg._id)}
                          sx={{ color: own ? alpha('#fff', 0.4) : '#8696a0', padding: 0.2, opacity: 0, transition: 'opacity 0.15s', '.MuiBox-root:hover &': { opacity: 1 } }}>
                          <MoreVert sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                    </Box>

                    {msg.reactions?.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.3, mt: 0.3, flexWrap: 'wrap' }}>
                        {Object.entries(
                          msg.reactions.reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <Tooltip key={emoji} title={msg.reactions.filter((r) => r.emoji === emoji).map((r) => r.user?.fullName || 'Unknown').join(', ')}>
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.2, bgcolor: isDark ? '#2a3942' : '#e8f4f8',
                              borderRadius: 10, px: 0.6, py: 0.1, fontSize: 12, boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
                            }}>
                              <span>{emoji}</span>
                              <Typography variant="caption" sx={{ fontSize: 10, color: textColor }}>{count}</Typography>
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
        {typing && !editMsg && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 0.3 }}>
            <Box sx={{
              bgcolor: receivedBg, color: '#00a884', p: 1.5, borderRadius: 2, borderBottomLeftRadius: 0,
              boxShadow: '0 1px 1px rgba(0,0,0,0.05)', clipPath: receivedTail,
            }}>
              <Typography variant="body2" sx={{ display: 'flex', gap: 0.5 }}>
                <Box component="span" sx={{ animation: 'typingBounce 1.4s infinite', display: 'inline-block', fontSize: 10 }}>●</Box>
                <Box component="span" sx={{ animation: 'typingBounce 1.4s infinite 0.2s', display: 'inline-block', fontSize: 10 }}>●</Box>
                <Box component="span" sx={{ animation: 'typingBounce 1.4s infinite 0.4s', display: 'inline-block', fontSize: 10 }}>●</Box>
              </Typography>
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />

        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes typingBounce { 0%,60%,100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
          .typing-dots span { animation: typingDot 1.4s infinite; opacity: 0; }
          .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
          .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes typingDot { 0%,60%,100% { opacity: 0; } 30% { opacity: 1; } }
        `}</style>
      </Box>

      <Dialog open={Boolean(lightboxImg)} onClose={() => setLightboxImg(null)} maxWidth="xl" fullWidth
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.92)', boxShadow: 'none', borderRadius: 0 } }}>
        <IconButton onClick={() => setLightboxImg(null)}
          sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 1, bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
          <Close />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          {lightboxImg && (
            <Box component="img" src={lightboxImg} sx={{ maxWidth: '95%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 1 }} />
          )}
        </Box>
      </Dialog>

      {replyToMsg && (
        <Box sx={{ bgcolor: isDark ? '#202c33' : '#f0f2f5', px: 2, py: 1, borderTop: '1px solid', borderColor, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ borderLeft: '3px solid #00a884', pl: 1, flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#00a884', fontWeight: 600, fontSize: 12 }}>
              {replyToMsg.sender?.fullName || 'You'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#8696a0', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400, fontSize: 12 }}>
              {replyToMsg.content || (replyToMsg.file ? '📎 File' : (replyToMsg.voice ? '🎤 Voice message' : ''))}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyToMsg(null)} sx={{ color: '#8696a0' }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      )}

      <Menu anchorEl={msgMenuAnchor} open={Boolean(msgMenuAnchor)} onClose={handleMsgMenuClose}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}>
        <MenuItem onClick={handleReplyClick}><ReplyIcon sx={{ mr: 1.5, fontSize: 20 }} /> Reply</MenuItem>
        <MenuItem onClick={handleReactClick}><EmojiEmotions sx={{ mr: 1.5, fontSize: 20 }} /> React</MenuItem>
        <MenuItem onClick={handleForwardClick}><ForwardIcon sx={{ mr: 1.5, fontSize: 20 }} /> Forward</MenuItem>
        {activeMsg?.content && (
          <MenuItem onClick={handleCopyClick}><ContentCopy sx={{ mr: 1.5, fontSize: 20 }} /> Copy</MenuItem>
        )}
        {isOwnActive && (
          <MenuItem onClick={handleEditClick}><EditIcon sx={{ mr: 1.5, fontSize: 20 }} /> Edit</MenuItem>
        )}
        <MenuItem onClick={handleInfoClick}><InfoIcon sx={{ mr: 1.5, fontSize: 20 }} /> Info</MenuItem>
        {isOwnActive && <Divider />}
        {isOwnActive && (
          <MenuItem onClick={handleDeleteFromMenu} sx={{ color: '#ef5350' }}>
            <Delete sx={{ mr: 1.5, fontSize: 20 }} /> Delete
          </MenuItem>
        )}
      </Menu>

      <Popover open={Boolean(reactPickerAnchor)} anchorEl={reactPickerAnchor}
        onClose={() => setReactPickerAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' } }}>
        <Box sx={{ display: 'flex', gap: 0.3, p: 1.5, bgcolor: isDark ? '#2a3942' : '#ffffff', borderRadius: 3 }}>
          {REACTIONS.map((emoji) => (
            <IconButton key={emoji} onClick={() => handleEmojiPick(emoji)}
              sx={{ fontSize: 30, padding: 0.5, transition: 'transform 0.15s ease', '&:hover': { transform: 'scale(1.4)' } }}>
              {emoji}
            </IconButton>
          ))}
        </Box>
      </Popover>

      <Box sx={{ p: 1.5, px: 2, bgcolor: headerBg, display: 'flex', alignItems: 'center', gap: 1 }}>
        {recording ? (
          <>
            <IconButton onClick={stopRecording} sx={{ color: '#ef5350', bgcolor: alpha('#ef5350', 0.1), width: 44, height: 44 }}>
              <MicOff />
            </IconButton>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FiberManualRecord sx={{ color: '#ef5350', fontSize: 12, animation: 'pulse 1s infinite' }} />
              <Typography sx={{ color: textColor, fontSize: 14 }}>{formatDuration(recordingDuration)}</Typography>
              <LinearProgress variant="determinate" value={100} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: isDark ? '#374045' : '#d4d4d4', '& .MuiLinearProgress-bar': { bgcolor: '#ef5350' } }} />
            </Box>
          </>
        ) : audioBlob ? (
          <>
            <IconButton onClick={() => { setAudioBlob(null); setRecordingDuration(0); }} sx={{ color: '#8696a0' }}>
              <Delete />
            </IconButton>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FiberManualRecord sx={{ color: '#00a884', fontSize: 12 }} />
              <Typography sx={{ color: textColor, fontSize: 14 }}>{formatDuration(recordingDuration)}</Typography>
              <LinearProgress variant="determinate" value={100} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: isDark ? '#374045' : '#d4d4d4', '& .MuiLinearProgress-bar': { bgcolor: '#00a884' } }} />
            </Box>
            <IconButton onClick={handleSend} sx={{ bgcolor: '#00a884', color: '#fff', width: 44, height: 44, '&:hover': { bgcolor: '#06cf9c' } }}>
              <Send />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton sx={{ color: '#8696a0' }} onClick={() => fileInputRef.current?.click()}>
              <AttachFile />
            </IconButton>
            <input ref={fileInputRef} type="file" hidden onChange={handleFileSelect} />
            <TextField fullWidth multiline maxRows={4} placeholder="Type a message"
              value={message} onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
              onKeyDown={handleKeyDown}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: inputBg, borderRadius: 3, color: textColor }, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }} />
            <IconButton onClick={startRecording} sx={{ color: '#8696a0', width: 44, height: 44 }}>
              <Mic />
            </IconButton>
            <IconButton onClick={handleSend} disabled={!message.trim()}
              sx={{ bgcolor: message.trim() ? '#00a884' : isDark ? '#374045' : '#d4d4d4', color: '#fff', width: 44, height: 44, '&:hover': { bgcolor: '#06cf9c' }, '&:disabled': { bgcolor: isDark ? '#374045' : '#d4d4d4', color: isDark ? '#667781' : '#999' } }}>
              <Send />
            </IconButton>
          </>
        )}
      </Box>

      <Dialog open={addMemberDialog} onClose={() => setAddMemberDialog(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Add Member</DialogTitle>
        <DialogContent>
          <List>
            {nonMemberFriends.length === 0 ? (
              <Typography color="#8696a0" sx={{ py: 2, textAlign: 'center', fontSize: 14 }}>All friends are already in the group</Typography>
            ) : (
              nonMemberFriends.map((f) => (
                <ListItem key={f._id} button onClick={() => { onAddToGroup(chat._id, f._id); setAddMemberDialog(false); }}
                  sx={{ borderRadius: 2, mb: 0.5 }}>
                  <ListItemAvatar><Avatar src={f.profilePic} /></ListItemAvatar>
                  <ListItemText primary={f.fullName} secondary={`@${f.username}`} />
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
      `}</style>
    </Box>
  );
};

export default ChatWindow;
