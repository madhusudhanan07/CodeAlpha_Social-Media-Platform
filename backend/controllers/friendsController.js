const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const NotificationsModel = require('../models/notificationsModel');

const friendRequestsCol = db.collection('friend_requests');
const friendsCol = db.collection('friends');
const usersCol = db.collection('users');

exports.sendRequest = async (req, res) => {
  try {
    const senderId = req.user.uid;
    const receiverId = req.params.userId;

    if (senderId === receiverId) {
      return res.status(400).json({ success: false, message: 'Cannot send request to yourself.' });
    }

    // Check if friends already (sorted composite ID)
    const [u1, u2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
    const friendDoc = await friendsCol.doc(`${u1}_${u2}`).get();
    if (friendDoc.exists) {
      return res.status(400).json({ success: false, message: 'Already friends.' });
    }

    // Check existing request (either direction)
    const reqId1 = `${senderId}_${receiverId}`;
    const reqId2 = `${receiverId}_${senderId}`;
    const [req1, req2] = await Promise.all([
      friendRequestsCol.doc(reqId1).get(),
      friendRequestsCol.doc(reqId2).get()
    ]);

    if (req1.exists || req2.exists) {
      return res.status(200).json({ success: true, message: 'Friend request already sent.' });
    }

    await friendRequestsCol.doc(reqId1).set({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
      created_at: FieldValue.serverTimestamp()
    });

    await NotificationsModel.createNotification(receiverId, senderId, 'FRIEND_REQUEST');

    res.status(200).json({ success: true, message: 'Friend request sent.' });
  } catch (error) {
    console.error('sendRequest error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const requestId = req.params.requestId;

    const reqRef = friendRequestsCol.doc(requestId);
    const reqDoc = await reqRef.get();

    if (!reqDoc.exists || reqDoc.data().receiver_id !== userId || reqDoc.data().status !== 'pending') {
      return res.status(404).json({ success: false, message: 'Request not found or already processed.' });
    }

    const senderId = reqDoc.data().sender_id;

    // Use Firestore batch (atomic)
    const batch = db.batch();

    // Update request status
    batch.update(reqRef, { status: 'accepted' });

    // Create friendship (sorted composite ID)
    const [u1, u2] = senderId < userId ? [senderId, userId] : [userId, senderId];
    batch.set(friendsCol.doc(`${u1}_${u2}`), {
      user1_id: u1,
      user2_id: u2,
      created_at: FieldValue.serverTimestamp()
    });

    await batch.commit();

    await NotificationsModel.createNotification(senderId, userId, 'FRIEND_ACCEPTED');

    res.status(200).json({ success: true, message: 'Request accepted.' });
  } catch (error) {
    console.error('acceptRequest error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const requestId = req.params.requestId;

    const reqRef = friendRequestsCol.doc(requestId);
    const reqDoc = await reqRef.get();

    if (reqDoc.exists && reqDoc.data().receiver_id === userId) {
      await reqRef.delete();
    }

    res.status(200).json({ success: true, message: 'Request rejected/removed.' });
  } catch (error) {
    console.error('rejectRequest error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.uid;
    const friendId = req.params.friendId;

    // Delete friendship (sorted composite ID)
    const [u1, u2] = userId < friendId ? [userId, friendId] : [friendId, userId];
    await friendsCol.doc(`${u1}_${u2}`).delete();

    // Delete any existing requests between them
    const reqId1 = `${userId}_${friendId}`;
    const reqId2 = `${friendId}_${userId}`;
    await Promise.all([
      friendRequestsCol.doc(reqId1).delete().catch(() => {}),
      friendRequestsCol.doc(reqId2).delete().catch(() => {})
    ]);

    res.status(200).json({ success: true, message: 'Friend removed.' });
  } catch (error) {
    console.error('removeFriend error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFriendsList = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Query friends where user is either user1 or user2
    const [snap1, snap2] = await Promise.all([
      friendsCol.where('user1_id', '==', userId).get(),
      friendsCol.where('user2_id', '==', userId).get()
    ]);

    const friendIds = new Set();
    snap1.docs.forEach(d => friendIds.add(d.data().user2_id));
    snap2.docs.forEach(d => friendIds.add(d.data().user1_id));

    const friends = await Promise.all(
      Array.from(friendIds).map(async (fId) => {
        const userDoc = await usersCol.doc(fId).get();
        const u = userDoc.exists ? userDoc.data() : {};

        // Compute mutual friends (simplified: count friends-of-friend that are also my friends)
        const [fSnap1, fSnap2] = await Promise.all([
          friendsCol.where('user1_id', '==', fId).get(),
          friendsCol.where('user2_id', '==', fId).get()
        ]);
        const theirFriends = new Set();
        fSnap1.docs.forEach(d => theirFriends.add(d.data().user2_id));
        fSnap2.docs.forEach(d => theirFriends.add(d.data().user1_id));
        theirFriends.delete(userId);

        let mutualCount = 0;
        for (const tf of theirFriends) {
          if (friendIds.has(tf)) mutualCount++;
        }

        return {
          id: fId,
          username: u.username || '',
          displayName: u.full_name || '',
          avatar: u.profile_picture || '',
          mutualFriends: mutualCount
        };
      })
    );

    res.status(200).json({ success: true, friends });
  } catch (error) {
    console.error('getFriendsList error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await friendRequestsCol
      .where('receiver_id', '==', userId)
      .where('status', '==', 'pending')
      .get();

    const requests = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const senderDoc = await usersCol.doc(data.sender_id).get();
        const sender = senderDoc.exists ? senderDoc.data() : {};

        return {
          requestId: doc.id,
          senderId: data.sender_id,
          username: sender.username || '',
          displayName: sender.full_name || '',
          avatar: sender.profile_picture || ''
        };
      })
    );

    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('getFriendRequests error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get current friends
    const [fSnap1, fSnap2] = await Promise.all([
      friendsCol.where('user1_id', '==', userId).get(),
      friendsCol.where('user2_id', '==', userId).get()
    ]);
    const friendIds = new Set();
    fSnap1.docs.forEach(d => friendIds.add(d.data().user2_id));
    fSnap2.docs.forEach(d => friendIds.add(d.data().user1_id));

    // Get pending requests
    const [rSnap1, rSnap2] = await Promise.all([
      friendRequestsCol.where('sender_id', '==', userId).get(),
      friendRequestsCol.where('receiver_id', '==', userId).get()
    ]);
    const requestIds = new Set();
    rSnap1.docs.forEach(d => requestIds.add(d.data().receiver_id));
    rSnap2.docs.forEach(d => requestIds.add(d.data().sender_id));

    const excludeIds = new Set([...friendIds, ...requestIds, userId]);

    // Get users and filter
    const usersSnap = await usersCol.limit(50).get();
    const suggestions = usersSnap.docs
      .filter(doc => !excludeIds.has(doc.id))
      .slice(0, 10)
      .map(doc => {
        const u = doc.data();
        return {
          id: doc.id,
          username: u.username || '',
          displayName: u.full_name || '',
          avatar: u.profile_picture || ''
        };
      });

    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error('getSuggestions error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.searchFriends = async (req, res) => {
  try {
    const userId = req.user.uid;
    const q = (req.query.q || '').toLowerCase();

    // Get current friends
    const [fSnap1, fSnap2] = await Promise.all([
      friendsCol.where('user1_id', '==', userId).get(),
      friendsCol.where('user2_id', '==', userId).get()
    ]);
    const friendIds = new Set();
    fSnap1.docs.forEach(d => friendIds.add(d.data().user2_id));
    fSnap2.docs.forEach(d => friendIds.add(d.data().user1_id));

    // Fetch friend profiles and filter by search term
    const friends = [];
    for (const fId of friendIds) {
      const userDoc = await usersCol.doc(fId).get();
      if (!userDoc.exists) continue;
      const u = userDoc.data();
      const username = (u.username || '').toLowerCase();
      const fullName = (u.full_name || '').toLowerCase();

      if (username.includes(q) || fullName.includes(q)) {
        friends.push({
          id: fId,
          username: u.username || '',
          displayName: u.full_name || '',
          avatar: u.profile_picture || ''
        });
      }
    }

    res.status(200).json({ success: true, friends });
  } catch (error) {
    console.error('searchFriends error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
