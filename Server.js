// Minimal Node.js server using Express
const express = require('express');
const multer = require('multer');
const app = express();
const port = 3000;
const upload = multer({ storage: multer.memoryStorage() });
const crypto = require('crypto');

let files = {}; // store files temporarily

app.use(express.static('public'));
app.use(express.json());

// Upload encrypted file
app.post('/upload', upload.single('file'), (req, res) => {
  const id = crypto.randomBytes(6).toString('hex');
  files[id] = {
    data: req.file.buffer.toString('base64'),
    name: req.file.originalname,
  };
  res.json({ link: `http://localhost:${port}/file/${id}` });
});

// Recipient views file request
app.get('/file/:id', (req, res) => {
  const file = files[req.params.id];
  if (!file) return res.send('File not found or expired.');

  // Simple HTML page with Accept button
  res.send(`
    <h2>File request: ${file.name}</h2>
    <button onclick="acceptFile()">Accept File</button>
    <script>
      async function acceptFile() {
        const res = await fetch('/download/${req.params.id}');
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '${file.name}';
        a.click();
      }
    </script>
  `);
});

// Download file after accept
app.get('/download/:id', (req, res) => {
  const file = files[req.params.id];
  if (!file) return res.status(404).send('File not found.');
  const buf = Buffer.from(file.data, 'base64');
  res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
  res.send(buf);
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
