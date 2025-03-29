// Mock data generator for testing without MongoDB

const generateMockUsers = (count = 5) => {
  const users = [];
  for (let i = 1; i <= count; i++) {
    users.push({
      id: `user_${i}`,
      username: `User ${i}`,
      isOnline: Math.random() > 0.5, // Random online status
      lastSeen: new Date().toISOString(),
    });
  }
  return users;
};

const generateMockMessages = (room, count = 10) => {
  const messages = [];
  for (let i = 1; i <= count; i++) {
    messages.push({
      id: `msg_${room}_${i}`,
      user: `User ${Math.ceil(Math.random() * 5)}`,
      userId: `user_${Math.ceil(Math.random() * 5)}`,
      text: `This is message ${i} in room ${room}`,
      room,
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(), // Spread out over time
      reactions: {},
    });
  }
  return messages;
};

module.exports = {
  generateMockUsers,
  generateMockMessages,
};
