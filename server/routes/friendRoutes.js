import { Router } from 'express';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendRequests, getFriends, removeFriend, getSentRequests } from '../controllers/friendController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/request', protect, sendFriendRequest);
router.put('/accept', protect, acceptFriendRequest);
router.put('/reject', protect, rejectFriendRequest);
router.get('/requests', protect, getFriendRequests);
router.get('/sent', protect, getSentRequests);
router.get('/', protect, getFriends);
router.delete('/', protect, removeFriend);

export default router;
