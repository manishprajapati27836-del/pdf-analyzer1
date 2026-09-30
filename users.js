// users.js
// Stores user accounts. Two modes:
//  - If MONGODB_URI is set (.env or hosting dashboard): accounts live in MongoDB Atlas,
//    so they are NOT erased when a free host restarts or redeploys.
//  - Otherwise: falls back to the local users.json file (fine for local testing only).

const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const FILE = path.join(__dirname, 'users.json');

// ---------- MongoDB mode ----------
let collectionPromise;
function getCollection() {
  if (!collectionPromise) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(MONGODB_URI);
    collectionPromise = client.connect().then(async () => {
      const col = client.db(process.env.MONGODB_DB || 'marginalia').collection('users');
      await col.createIndex({ email: 1 }, { unique: true });
      return col;
    });
  }
  return collectionPromise;
}

function fromDoc(doc) {
  return doc && { id: doc._id.toString(), email: doc.email, password_hash: doc.password_hash, created_at: doc.created_at };
}

// ---------- File mode ----------
function loadAll() {
  if (!fs.existsSync(FILE)) return [];
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Could not read users.json, starting fresh:', err);
    return [];
  }
}

function saveAll(users) {
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2), 'utf8');
}

// ---------- Public API (always async) ----------
async function findByEmail(email) {
  if (MONGODB_URI) {
    const col = await getCollection();
    return fromDoc(await col.findOne({ email }));
  }
  return loadAll().find((u) => u.email === email) || null;
}

async function create(email, passwordHash) {
  if (MONGODB_URI) {
    const col = await getCollection();
    const doc = { email, password_hash: passwordHash, created_at: new Date().toISOString() };
    const result = await col.insertOne(doc);
    return fromDoc({ ...doc, _id: result.insertedId });
  }
  const users = loadAll();
  const newUser = {
    id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
    email,
    password_hash: passwordHash,
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  saveAll(users);
  return newUser;
}

module.exports = { findByEmail, create };
