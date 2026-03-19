require('dotenv').config();
const isDevelopment = (process.env.NODE_ENV === 'development');
const express = require('express');
const app = express();
const fs = require('fs');
const os = require('os');

let options = {};
if (isDevelopment) {
  options = {
    key:  fs.readFileSync('./localhost.key'),
    cert: fs.readFileSync('./localhost.crt')
  };
}

const server = require(isDevelopment ? 'https' : 'http').Server(options, app);
const port = process.env.PORT || 3000;

app.use(express.static('public'));

server.listen(port, () => {
  const networkInterfaces = os.networkInterfaces();
  for (const iface of Object.values(networkInterfaces).flat()) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`https://${iface.address}:${port}`);
    }
  }
});

const { Server } = require("socket.io");
const io = new Server(server);

const clients = {};
io.on('connection', socket => {
  clients[socket.id] = { id: socket.id };
  io.emit('clients', clients);

  socket.on('disconnect', () => {
    io.emit('client-disconnect', socket.id);
    delete clients[socket.id];
    io.emit('clients', clients);
  });

  socket.on('signal', (peerId, signal) => {
    io.to(peerId).emit('signal', peerId, signal, socket.id);
  });

  socket.on('update', (targetSocketId, data) => {
    if (clients[targetSocketId]) {
      io.to(targetSocketId).emit('update', data);
    }
  });

  io.emit('client-connection', clients[socket.id]);
});