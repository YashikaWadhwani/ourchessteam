const express = require('express');
const path = require('path');
const app = express();

// Serve static files from React's build folder
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Example API route for tournaments
app.get('/api/tournaments', (req, res) => {
  res.json([{ name: "Winter Open", date: "2023-12-15" }]);
});

// All other routes go to React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
  socket.on('move', (move) => {
    io.emit('move', move); // Broadcast to all clients
  });
});

server.listen(PORT, () => console.log(`Server + Socket.io on port ${PORT}`));