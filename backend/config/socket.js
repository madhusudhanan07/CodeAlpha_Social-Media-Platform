const { Server } = require('socket.io');

const onlineUsers = new Map(); // Map<firebase_uid, socket.id>
let ioInstance = null;

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // For development, allow all
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    // Map user to socket (we assume user sends their UID on connection via an event, or query param)
    const userId = socket.handshake.query.userId;
    if (userId) {
      onlineUsers.set(userId, socket.id);
      io.emit('online', { userId });
    }

    socket.on('join_room', (room) => {
      socket.join(room);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
    });

    socket.on('typing', ({ room, typerId }) => {
      socket.to(room).emit('typing', { typerId });
    });

    socket.on('stop_typing', ({ room, typerId }) => {
      socket.to(room).emit('stop_typing', { typerId });
    });

    socket.on('send_message', (msg) => {
      // Broadcast to room (should be the conversationId)
      // `msg` should contain: conversationId, senderId, receiverId, content, etc.
      
      // Emit to the specific room (this targets both users if they joined the conversation room)
      io.to(msg.conversationId).emit('receive_message', msg);
    });

    socket.on('message_seen', ({ conversationId, readerId, messageId }) => {
      io.to(conversationId).emit('message_seen', { conversationId, readerId, messageId });
    });

    socket.on('disconnect', () => {
      let disconnectedUserId = null;
      for (const [key, value] of onlineUsers.entries()) {
        if (value === socket.id) {
          disconnectedUserId = key;
          onlineUsers.delete(key);
          break;
        }
      }

      if (disconnectedUserId) {
        io.emit('offline', { userId: disconnectedUserId, lastSeen: new Date() });
      }
      console.log(`Socket Disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIo() {
  return ioInstance;
}

function getConnectedUsers() {
  return Object.fromEntries(onlineUsers);
}

module.exports = { initSocket, getIo, getConnectedUsers };


