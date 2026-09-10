const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let notes = [];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/notes', (req, res) => {
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const note = { id: Date.now(), text: req.body.text || '' };
  notes.push(note);
  res.status(201).json(note);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
