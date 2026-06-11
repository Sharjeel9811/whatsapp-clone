import { Router } from 'express';
import { accessChat, fetchChats, createGroupChat, addToGroup, removeFromGroup, leaveGroup } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, accessChat);
router.get('/', protect, fetchChats);
router.post('/group', protect, createGroupChat);
router.put('/group/add', protect, addToGroup);
router.put('/group/remove', protect, removeFromGroup);
router.put('/group/leave', protect, leaveGroup);

export default router;
