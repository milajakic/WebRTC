const express = require('express')
const app = express()
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const os = require('os');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 80;

const clients = {};

io.on('connection', socket => {
  clients[socket.id] = { id: socket.id };
  console.log('Socket connected', socket.id);

  clients[socket.id].x = 0;
  clients[socket.id].y = 0;

  // Handle mouse/touch position updates
  socket.on('update', (targetSocketId, data) => {
    if (!clients[targetSocketId]) {
      return;
    }
    clients[socket.id].x = data.x;
    clients[socket.id].y = data.y;
    io.to(targetSocketId).emit('update', data);
  });

  // WebRTC Signaling events
  socket.on('offer', (targetSocketId, offer) => {
    console.log(`Offer from ${socket.id} to ${targetSocketId}`);
    if (clients[targetSocketId]) {
      io.to(targetSocketId).emit('offer', {
        from: socket.id,
        offer: offer
      });
    }
  });

  socket.on('answer', (targetSocketId, answer) => {
    console.log(`Answer from ${socket.id} to ${targetSocketId}`);
    if (clients[targetSocketId]) {
      io.to(targetSocketId).emit('answer', {
        from: socket.id,
        answer: answer
      });
    }
  });

  socket.on('ice-candidate', (targetSocketId, candidate) => {
    console.log(`ICE candidate from ${socket.id} to ${targetSocketId}`);
    if (clients[targetSocketId]) {
      io.to(targetSocketId).emit('ice-candidate', {
        from: socket.id,
        candidate: candidate
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
    // Notify other client that connection is closed
    io.emit('peer-disconnected', socket.id);
    delete clients[socket.id];
  });

});

app.use(express.static('public'));

server.listen(port, () => {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`http://${iface.address}`);
      }
    }
  }
  console.log(`App listening on port ${port}!`);
});