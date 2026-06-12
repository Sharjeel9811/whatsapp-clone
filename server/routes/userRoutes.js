import { Router } from 'express';
import { searchUsers, blockUser, unblockUser, getUserProfile, getBlockedUsers, heartbeat } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/search', protect, searchUsers);
router.get('/profile/:userId', protect, getUserProfile);
router.post('/block/:userId', protect, blockUser);
router.post('/unblock/:userId', protect, unblockUser);
router.get('/blocked', protect, getBlockedUsers);
router.post('/heartbeat', protect, heartbeat);

export default router;
