import Notification from '../models/Notification.js';

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export { getNotifications, markAsRead, markAllAsRead };
