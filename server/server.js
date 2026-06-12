import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import setupSocket from './socket/socketHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',');

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  pingInterval: 5000,
  pingTimeout: 4000,
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let cachedDb = null;

const connectDb = async () => {
  if (cachedDb) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    cachedDb = true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
};

app.use(async (req, res, next) => {
  if (!cachedDb) await connectDb();
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/file', uploadRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/online', async (req, res) => {
  try {
    if (!cachedDb) await connectDb();
    const threshold = new Date(Date.now() - 5 * 60 * 1000);
    const online = await User.find({ isOnline: true, lastSeen: { $gte: threshold } }).select('_id lastSeen').lean();
    res.json(online.map((u) => ({ userId: u._id, lastSeen: u.lastSeen })));
  } catch (err) {
    res.json([]);
  }
});

setupSocket(io);
app.set('io', io);

const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  const PORT = process.env.PORT || 5000;
  connectDb().then(() => server.listen(PORT, () => console.log(`Server running on port ${PORT}`)));
}

export default app;
export { server, io };
