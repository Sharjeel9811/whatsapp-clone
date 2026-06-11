# WhatsApp Clone - MERN Stack

A real-time chat application similar to WhatsApp built with MongoDB, Express.js, React.js, Node.js, and Socket.IO.

## Features

- **Authentication** - Register, Login, JWT-based auth, Logout, OTP email verification
- **User Management** - Profile update with picture upload, search users by name/username
- **Friend Management** - Send/accept/reject friend requests, friends list, remove friends
- **One-to-One Chat** - Real-time messaging, typing indicator, online/offline status, last seen
- **Group Chat** - Create groups, add/remove members, leave group, real-time group messages
- **Notifications** - New friend requests, friend accepted, group invitations
- **Theme Changer** - Dark/Light mode toggle with persistent preference
- **Profile Picture Upload** - Upload via Multer with file picker
- **Security** - bcrypt password hashing, JWT authentication, protected routes

## Setup

### Prerequisites

- Node.js >= 16
- MongoDB connection (Atlas URI already configured in `.env`)

### Backend

```bash
cd server
npm install
# Ensure MongoDB is running
npm run dev
```

Server starts on http://localhost:5000

### Frontend

```bash
cd client
npm install
npm run dev
```

Client starts on http://localhost:3000

### OTP Email (Development Mode)

In development mode, OTPs are logged to the server console instead of being sent via email.
Check the backend terminal output for the OTP when registering.

For production, configure real SMTP in `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## How to Test the Application

### 1. Start the Servers

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```
Wait for "MongoDB connected" and "Server running on port 5000"

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```
Wait for the Vite dev server URL (http://localhost:3000)

### 2. Test Registration Flow

1. Open http://localhost:3000 in your browser
2. Click "Register"
3. Fill in: Full Name, Username, Email, Password, Confirm Password
4. (Optional) Click the avatar to upload a profile picture
5. Click "Register"
6. Check the **backend terminal** for the OTP (look for "=== EMAIL (DEV MODE) ===")
7. Enter the 6-digit OTP and click "Verify OTP"
8. You'll be logged in automatically

### 3. Test Login

1. Logout via the menu (top-left hamburger icon -> Logout)
2. Click "Login" and enter your email + password
3. You should be logged in and see the main chat interface

### 4. Test User Search & Friend Requests

1. Open a second browser (or incognito window)
2. Register a second user with a different email/username
3. In the first user's session, type the second user's name in the search bar
4. Click the person-add icon next to the user to send a friend request
5. In the second user's session, switch to the "Requests" tab (3rd tab)
6. Click the checkmark to accept the friend request
7. Both users will see each other in the "Friends" tab

### 5. Test One-to-One Chat

1. Once both users are friends, click on a friend's name in the Chats or Friends tab
2. A chat window opens on the right
3. Type a message and press Enter or click Send
4. The message appears instantly in the other user's browser
5. Typing indicator shows when the other user is typing
6. Online/offline status is shown next to the user's name

### 6. Test Group Chat

1. In either user's session, click "Create Group" in the Chats tab
2. Enter a group name (e.g., "Test Group")
3. Select at least 2 friends
4. Click "Create Group"
5. The group appears in the chat list
6. Click the group to open it and send messages
7. All group members receive messages in real-time
8. Click the 3-dot menu for group options: Add Member, Remove Member, Leave Group

### 7. Test Profile Update

1. Click the hamburger menu (top-left)
2. Click "Profile"
3. Change your name and/or upload a new profile picture
4. Click "Save"
5. The profile updates across the app

### 8. Test Notifications

1. Send a friend request from one user to another
2. The receiving user gets a notification (bell icon in top bar)
3. Accept the request - the sender gets a notification
4. Create a group and add members - they get group invitation notifications

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user (multipart: name, username, email, password, profilePic) |
| POST | /api/auth/verify-otp | Verify OTP (email, otp) |
| POST | /api/auth/resend-otp | Resend OTP (email) |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update profile (multipart: fullName, profilePic) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/search?search= | Search users |
| GET | /api/users/:id | Get user by ID |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/friends/request | Send friend request |
| PUT | /api/friends/accept | Accept request |
| PUT | /api/friends/reject | Reject request |
| GET | /api/friends/requests | Get received requests |
| GET | /api/friends/sent | Get sent requests |
| GET | /api/friends | Get friends list |
| DELETE | /api/friends | Remove friend |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chats | Create/access one-to-one chat |
| GET | /api/chats | Get all user chats |
| POST | /api/chats/group | Create group chat |
| PUT | /api/chats/group/add | Add member to group |
| PUT | /api/chats/group/remove | Remove member from group |
| PUT | /api/chats/group/leave | Leave group |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/messages | Send message |
| GET | /api/messages/:chatId | Get chat messages |
| DELETE | /api/messages/:messageId | Delete message |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get notifications |
| PUT | /api/notifications/read | Mark notification as read |
| PUT | /api/notifications/read-all | Mark all as read |

## Database Schema

### User
- `fullName` - String
- `username` - String (unique)
- `email` - String (unique)
- `password` - String (hashed)
- `profilePic` - String (path/URL)
- `isOnline` - Boolean
- `lastSeen` - Date
- `isVerified` - Boolean

### Otp
- `email` - String
- `otp` - String
- `expiresAt` - Date (auto-deletes after expiry)

### FriendRequest
- `sender` - ObjectId (ref: User)
- `receiver` - ObjectId (ref: User)
- `status` - Enum: pending/accepted/rejected

### Chat
- `chatName` - String
- `isGroupChat` - Boolean
- `users` - [ObjectId] (ref: User)
- `groupAdmin` - ObjectId (ref: User)
- `latestMessage` - ObjectId (ref: Message)

### Message
- `chat` - ObjectId (ref: Chat)
- `sender` - ObjectId (ref: User)
- `content` - String
- `readBy` - [ObjectId] (ref: User)

### Notification
- `user` - ObjectId (ref: User)
- `type` - Enum
- `message` - String
- `data` - Mixed
- `read` - Boolean

## Tech Stack

**Frontend**: React, Material UI, React Router, Socket.IO Client, Axios
**Backend**: Node.js, Express, JWT, Socket.IO, bcryptjs, Multer, Nodemailer
**Database**: MongoDB, Mongoose
