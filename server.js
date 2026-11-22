// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2026 Marcus Beauregard

const express = require('express');
const db = require('./db');
const app = express();
app.use(express.json());

app.get('/notes', (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const size = parseInt(req.query.size || '20', 10);
  const notes = db.all().slice((page - 1) * size, page * size);
  res.json(notes);
});

app.post('/notes', (req, res) => {
  const { title, body } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (typeof title !== 'string') {
    return res.status(400).json({ error: 'title must be a string' });
  }
  if (!title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (body !== undefined && typeof body !== 'string') {
    return res.status(400).json({ error: 'body must be a string' });
  }
  const note = db.create(title, body || '');
  res.location(`/notes/${note.id}`).status(201).json(note);
});

app.get('/notes/:id', (req, res) => {
  const note = db.get(req.params.id);
  if (!note) return res.status(404).json({ error: 'not found' });
  res.json(note);
});

app.patch('/notes/:id', (req, res) => {
  const note = db.get(req.params.id);
  if (!note) return res.status(404).json({ error: 'not found' });

  const fields = {};
  for (const key of ['title', 'body']) {
    if (req.body[key] !== undefined) fields[key] = req.body[key];
  }
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'title or body is required' });
  }
  if (fields.title !== undefined && (typeof fields.title !== 'string' || !fields.title.trim())) {
    return res.status(400).json({ error: 'title must be a non-empty string' });
  }
  if (fields.body !== undefined && typeof fields.body !== 'string') {
    return res.status(400).json({ error: 'body must be a string' });
  }

  res.json(db.update(req.params.id, fields));
});

app.delete('/notes/:id', (req, res) => {
  const { changes } = db.remove(req.params.id);
  if (changes === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log('notes-api listening on ' + port));
}

module.exports = app;
