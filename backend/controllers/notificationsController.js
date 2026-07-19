const NotificationsModel = require('../models/notificationsModel');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await NotificationsModel.getNotifications(req.user.uid);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await NotificationsModel.markAsRead(req.user.uid);
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
