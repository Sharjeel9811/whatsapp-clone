import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import {
  Box, TextField, InputAdornment, List, ListItem, ListItemAvatar, ListItemText, Avatar,
  Typography, Tabs, Tab, Badge, IconButton, Chip, Tooltip, alpha,
} from '@mui/material';
import { Search, PersonAdd, GroupAdd, Check, Close, Person } from '@mui/icons-material';
import API from '../utils/axios';
import { fileUrl } from '../utils/config';

const ChatSidebar = ({
  chats, selectedChat, onSelectChat, onAccessChat, friends, friendRequests,
  onSendRequest, onAcceptRequest, onRejectRequest, onRemoveFriend, onOpenGroup, onlineUsers,
  readChatIds,
}) => {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const [tab, setTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const isDark = mode === 'dark';
  const bgColor = isDark ? '#111b21' : '#ffffff';
  const headerBg = isDark ? '#202c33' : '#f0f2f5';
  const hoverBg = isDark ? '#2a3942' : '#f0f2f5';
  const selectedBg = isDark ? '#2a3942' : '#e8f4f8';
  const borderColor = isDark ? '#313d45' : '#e9edef';
  const textPrimary = isDark ? '#e9edef' : '#111b21';
  const textSecondary = '#8696a0';

  useEffect(() => {
    const counts = {};
    chats.forEach((chat) => {
      if (chat.latestMessage && chat.latestMessage.sender?._id !== user._id && !readChatIds.has(chat._id)) {
        counts[chat._id] = 1;
      }
    });
    setUnreadCounts(counts);
  }, [chats, user._id, readChatIds]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    try { const { data } = await API.get(`/users/search?search=${query}`); setSearchResults(data); } catch {}
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getChatName = (chat) => {
    if (chat.isGroupChat) return chat.chatName;
    const other = chat.users?.find((u) => u._id !== user._id);
    return other?.fullName || 'Unknown';
  };

  const getChatAvatar = (chat) => {
    if (chat.isGroupChat) return '';
    const other = chat.users?.find((u) => u._id !== user._id);
    return other?.profilePic || '';
  };

  const isFriendOnline = (chat) => {
    if (chat.isGroupChat) return false;
    const other = chat.users?.find((u) => u._id !== user._id);
    return other ? onlineUsers.includes(other._id) : false;
  };

  const renderChats = () => (
    chats.length === 0 ? (
      <Box sx={{ p: 4, textAlign: 'center', color: textSecondary }}>
        <PersonAdd sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
        <Typography variant="body2">No conversations yet.</Typography>
        <Typography variant="caption">Search users to start chatting</Typography>
      </Box>
    ) : (
      chats.map((chat) => {
        const unread = unreadCounts[chat._id] || 0;
        const isSelected = selectedChat?._id === chat._id;
        return (
          <ListItem key={chat._id} button selected={isSelected}
            onClick={() => onSelectChat(chat)}
            sx={{ py: 1.5, px: 2, bgcolor: isSelected ? selectedBg : 'transparent', '&:hover': { bgcolor: hoverBg }, borderBottom: '1px solid', borderColor }}>
            <ListItemAvatar>
              <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot" color={isFriendOnline(chat) ? 'success' : 'default'}>
                <Avatar src={fileUrl(getChatAvatar(chat))} sx={{ width: 48, height: 48 }}>
                  {!getChatAvatar(chat) && (chat.isGroupChat ? <GroupAdd /> : <Person />)}
                </Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={getChatName(chat)}
              secondary={chat.latestMessage?.content?.substring(0, 35) || (chat.isGroupChat ? 'Group created' : 'No messages yet')}
              primaryTypographyProps={{ color: textPrimary, fontWeight: isSelected || unread > 0 ? 600 : 400, fontSize: 16 }}
              secondaryTypographyProps={{ color: textSecondary, noWrap: true }}
            />
            <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
              <Typography variant="caption" color={textSecondary}>
                {formatTime(chat.latestMessage?.createdAt || chat.updatedAt)}
              </Typography>
              {unread > 0 && (
                <Chip label={unread} size="small" sx={{ bgcolor: '#00a884', color: '#fff', fontSize: 11, height: 20, minWidth: 20 }} />
              )}
            </Box>
          </ListItem>
        );
      })
    )
  );

  const renderSearch = () => (
    searchResults.map((u) => {
      const isFriend = friends.some((f) => f._id === u._id);
      const hasPending = friendRequests.some((r) => r.sender?._id === u._id || r.receiver?._id === u._id);
      return (
        <ListItem key={u._id} button onClick={() => { if (isFriend) onAccessChat(u._id); }}
          sx={{ py: 1.5, px: 2, '&:hover': { bgcolor: hoverBg }, borderBottom: '1px solid', borderColor }}>
          <ListItemAvatar>
            <Badge overlap="circular" variant="dot" color={onlineUsers.includes(u._id) ? 'success' : 'default'}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
              <Avatar src={fileUrl(u.profilePic)} sx={{ width: 48, height: 48 }} />
            </Badge>
          </ListItemAvatar>
          <ListItemText primary={u.fullName} secondary={`@${u.username}`}
            primaryTypographyProps={{ color: textPrimary, fontWeight: 500 }}
            secondaryTypographyProps={{ color: textSecondary }} />
          {isFriend ? (
            <Chip label="Friend" size="small" sx={{ bgcolor: alpha('#00a884', 0.15), color: '#00a884', fontWeight: 600 }} />
          ) : hasPending ? (
            <Chip label="Pending" size="small" variant="outlined" sx={{ color: textSecondary }} />
          ) : (
            <Tooltip title="Add Friend">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSendRequest(u._id, u.fullName); }}
                sx={{ color: '#00a884', '&:hover': { bgcolor: alpha('#00a884', 0.1) } }}>
                <PersonAdd />
              </IconButton>
            </Tooltip>
          )}
        </ListItem>
      );
    })
  );

  const renderFriends = () => (
    friends.length === 0 ? (
      <Box sx={{ p: 4, textAlign: 'center', color: textSecondary }}>
        <PersonAdd sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
        <Typography variant="body2">No friends yet.</Typography>
        <Typography variant="caption">Search and add friends to start chatting</Typography>
      </Box>
    ) : (
      friends.map((f) => (
        <ListItem key={f._id} button onClick={() => onAccessChat(f._id)}
          sx={{ py: 1.5, px: 2, '&:hover': { bgcolor: hoverBg }, borderBottom: '1px solid', borderColor }}>
          <ListItemAvatar>
            <Badge overlap="circular" variant="dot" color={onlineUsers.includes(f._id) ? 'success' : 'default'}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
              <Avatar src={fileUrl(f.profilePic)} sx={{ width: 48, height: 48 }} />
            </Badge>
          </ListItemAvatar>
          <ListItemText primary={f.fullName} secondary={`@${f.username}`}
            primaryTypographyProps={{ color: textPrimary, fontWeight: 500 }}
            secondaryTypographyProps={{ color: textSecondary }} />
          <Tooltip title="Remove Friend">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemoveFriend(f._id); }}
              sx={{ color: '#ef5350', '&:hover': { bgcolor: alpha('#ef5350', 0.1) } }}>
              <Close />
            </IconButton>
          </Tooltip>
        </ListItem>
      ))
    )
  );

  const renderRequests = () => (
    friendRequests.length === 0 ? (
      <Box sx={{ p: 4, textAlign: 'center', color: textSecondary }}>
        <PersonAdd sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
        <Typography variant="body2">No pending requests.</Typography>
      </Box>
    ) : (
      friendRequests.map((r) => (
        <ListItem key={r._id} sx={{ py: 1.5, px: 2, '&:hover': { bgcolor: hoverBg }, borderBottom: '1px solid', borderColor }}>
          <ListItemAvatar><Avatar src={fileUrl(r.sender?.profilePic)} sx={{ width: 48, height: 48 }} /></ListItemAvatar>
          <ListItemText primary={r.sender?.fullName} secondary={`@${r.sender?.username}`}
            primaryTypographyProps={{ color: textPrimary, fontWeight: 500 }}
            secondaryTypographyProps={{ color: textSecondary }} />
          <Tooltip title="Accept">
            <IconButton onClick={() => onAcceptRequest(r._id, r.sender?._id)} sx={{ color: '#00a884', mr: 0.5 }}>
              <Check />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reject">
            <IconButton onClick={() => onRejectRequest(r._id)} sx={{ color: '#ef5350' }}>
              <Close />
            </IconButton>
          </Tooltip>
        </ListItem>
      ))
    )
  );

  return (
    <Box sx={{ width: { xs: '100%', md: 400 }, minWidth: { xs: '100%', md: 400 }, bgcolor: bgColor, borderRight: { xs: 'none', md: '1px solid' }, borderColor, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, bgcolor: headerBg }}>
        <TextField fullWidth size="small" placeholder="Search users..."
          value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: textSecondary }} /></InputAdornment>,
            sx: { bgcolor: isDark ? '#2a3942' : '#e4e6eb', borderRadius: 3, color: textPrimary, '&::placeholder': { color: textSecondary } },
          }}
          sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }} />
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)}
        sx={{ bgcolor: headerBg, minHeight: 48,
          '& .MuiTab-root': { color: textSecondary, textTransform: 'none', minHeight: 48, py: 1 },
          '& .Mui-selected': { color: '#00a884', fontWeight: 600 },
          '& .MuiTabs-indicator': { bgcolor: '#00a884' } }}>
        <Tab label={<span>Chats <Chip label={chats.length} size="small" sx={{ ml: 0.5, height: 18, fontSize: 11, bgcolor: alpha('#00a884', 0.15), color: '#00a884' }} /></span>} />
        <Tab label={<span>Friends <Chip label={friends.length} size="small" sx={{ ml: 0.5, height: 18, fontSize: 11, bgcolor: alpha('#00a884', 0.15), color: '#00a884' }} /></span>} />
        <Tab label={<span>Requests {friendRequests.length > 0 && <Chip label={friendRequests.length} size="small" sx={{ ml: 0.5, height: 18, fontSize: 11, bgcolor: '#ef5350', color: '#fff' }} />}</span>} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {searchQuery ? (
          <List sx={{ py: 0 }}>{renderSearch()}</List>
        ) : (
          <>
            {tab === 0 && (
              <List sx={{ py: 0 }}>
                <ListItem button onClick={onOpenGroup}
                  sx={{ py: 1.5, px: 2, bgcolor: isDark ? alpha('#00a884', 0.08) : alpha('#00a884', 0.05), '&:hover': { bgcolor: hoverBg }, borderBottom: '1px solid', borderColor }}>
                  <ListItemAvatar><Avatar sx={{ bgcolor: '#00a884' }}><GroupAdd /></Avatar></ListItemAvatar>
                  <ListItemText primary="Create Group" primaryTypographyProps={{ color: '#00a884', fontWeight: 600 }} />
                </ListItem>
                {renderChats()}
              </List>
            )}
            {tab === 1 && <List sx={{ py: 0 }}>{renderFriends()}</List>}
            {tab === 2 && <List sx={{ py: 0 }}>{renderRequests()}</List>}
          </>
        )}
      </Box>
    </Box>
  );
};

export default ChatSidebar;
