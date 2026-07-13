const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json()); // Чтение JSON-данных

const dataPath = path.join(__dirname, 'data.json');

// Безопасное чтение БД
function readData() {
  try {
    if (!fs.existsSync(dataPath)) {
      return { users: [], cards: [] };
    }
    const raw = fs.readFileSync(dataPath, 'utf8');
    const db = JSON.parse(raw);
    
    if (!db.users) db.users = [];
    if (!db.cards) db.cards = [];
    
    return db;
  } catch (e) {
    return { users: [], cards: [] };
  }
}

// Запись в БД
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. РЕГИСТРАЦИЯ
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body || {};
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Заполните все поля!' });
  }

  const db = readData();

  const userExists = db.users.find(u => u.email === email);
  if (userExists) {
    return res.status(400).json({ message: 'Пользователь с такой почтой уже существует' });
  }

  const newId = db.users.length > 0 ? (db.users[db.users.length - 1].id + 1) : 1;

  const newUser = {
    id: newId,
    username,
    email,
    password
  };

  db.users.push(newUser);
  writeData(db);

  res.status(201).json({ id: newUser.id, username: newUser.username });
});

// 2. АВТОРИЗАЦИЯ (ВХОД)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Введите почту и пароль!' });
  }

  const db = readData();

  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Неверная почта или пароль' });
  }

  res.json({ id: user.id, username: user.username });
});

// 3. ПОЛУЧЕНИЕ КАРТОЧЕК
app.get('/api/cards', (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) {
    return res.status(400).json({ message: 'userId не указан' });
  }

  const db = readData();
  const userCards = db.cards.filter(card => card.userId === userId);
  res.json(userCards);
});

// 4. СОХРАНЕНИЕ / СИНХРОНИЗАЦИЯ КАРТОЧЕК
app.post('/api/cards', (req, res) => {
  const userId = parseInt(req.query.userId);
  const newCards = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId не указан' });
  }

  const db = readData();

  // Удаляем старые карточки этого пользователя
  db.cards = db.cards.filter(card => card.userId !== userId);

  // Привязываем новые
  if (Array.isArray(newCards)) {
    const preparedCards = newCards.map(card => ({
      id: card.id,
      question: card.question,
      answer: card.answer,
      userId: userId
    }));
    db.cards.push(...preparedCards);
  }

  writeData(db);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});