import { Router } from 'express';
import { sendMessage, allMessages, deleteMessage, reactToMessage, editMessage, forwardMessage, markAsDelivered, markAsRead } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

router.post('/', protect, upload.single('file'), sendMessage);
router.get('/:chatId', protect, allMessages);
router.delete('/:messageId', protect, deleteMessage);
router.put('/:messageId/react', protect, reactToMessage);
router.put('/:messageId/edit', protect, editMessage);
router.post('/forward', protect, forwardMessage);
router.put('/deliver/mark', protect, markAsDelivered);
router.put('/read/mark', protect, markAsRead);

export default router;
