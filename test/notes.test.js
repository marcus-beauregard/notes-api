'use strict';
// Runs against an in-memory database, so requiring the app never touches notes.db.
process.env.NOTES_DB = ':memory:';

const test = require('node:test');
const assert = require('node:assert');
const app = require('../server');

let server;
let base;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test('POST includes a Location header pointing at the created note', async () => {
  const created = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'located', body: '' }),
  });
  assert.strictEqual(created.status, 201);
  const note = await created.json();
  assert.strictEqual(created.headers.get('location'), `/notes/${note.id}`);
});

test('DELETE removes an existing note and then reports it missing', async () => {
  const created = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'first', body: 'hello' }),
  });
  assert.strictEqual(created.status, 201);
  const note = await created.json();

  const deleted = await fetch(`${base}/notes/${note.id}`, { method: 'DELETE' });
  assert.strictEqual(deleted.status, 204);

  const gone = await fetch(`${base}/notes/${note.id}`);
  assert.strictEqual(gone.status, 404);
});

test('DELETE of a missing note returns 404 instead of a second 204', async () => {
  const missing = await fetch(`${base}/notes/999999`, { method: 'DELETE' });
  assert.strictEqual(missing.status, 404);
  assert.deepStrictEqual(await missing.json(), { error: 'not found' });
});

test('DELETE of a non-numeric id returns 404, not a driver error', async () => {
  const bad = await fetch(`${base}/notes/nope`, { method: 'DELETE' });
  assert.strictEqual(bad.status, 404);
  assert.deepStrictEqual(await bad.json(), { error: 'not found' });
});

test('POST rejects a non-string title with 400 instead of a driver 500', async () => {
  const bad = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 42 }),
  });
  assert.strictEqual(bad.status, 400);
  assert.deepStrictEqual(await bad.json(), { error: 'title must be a string' });
});

test('POST rejects a non-string body with 400 instead of a driver 500', async () => {
  const bad = await fetch(`${base}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'valid', body: [] }),
  });
  assert.strictEqual(bad.status, 400);
  assert.deepStrictEqual(await bad.json(), { error: 'body must be a string' });
});
