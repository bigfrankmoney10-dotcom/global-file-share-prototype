// server.js
const express = require('express');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

// File upload storage
const upload = multer({ dest: 'uploads/' });
app.use(express.static('public'));
app.use(express.json());

// Store files in memory for simplicity
const files = {};

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  const id = crypto.randomBytes(6).toString('hex');
  files[id] = {
    path: req.file.path,
    filename: req.file.originalname,
  };
  res.json({ link: `http://localhost:${port}/file/${id}`, id });
});

// Serve accept page
app.get('/file/:id', (req, res) => {
  const file = files[req.params.id];
  if (!file) return res.send('File not found or expired.');

  res.send(`
    <h2>File request: ${file.filename}</h2>
    <button onclick="acceptFile()">Accept File</button>
    <p id="notif" style="color:green;"></p>
    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();
      const fileId = "${req.params.id}";

      function acceptFile() {
        fetch('/download/' + fileId)
          .then(res => res.blob())
          .then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = "${file.filename}";
            a.click();
            socket.emit('accepted', fileId);
            document.getElementById('notif').innerText = 'File accepted! You can close this page.';
          });
      }
    </script>
  `);
});

// Download file endpoint
app.get('/download/:id', (req, res) => {
  const file = files[req.params.id];
  if (!file) return res.status(404).send('File not found.');
  res.download(path.resolve(file.path), file.filename, (err) => {
    if (!err) {
      fs.unlink(file.path, () => {});
      delete files[req.params.id];
    }
  });
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (fileId) => {
    socket.join(fileId);
  });

  socket.on('accepted', (fileId) => {
    io.to(fileId).emit('notification', 'Recipient accepted your file!');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(port, () => console.log(`SkySend running at http://localhost:${port}`));
