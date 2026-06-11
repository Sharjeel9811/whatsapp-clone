import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, getNotifications);
router.put('/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);

export default router;
