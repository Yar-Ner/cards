const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json()); // Чтение JSON-данных

// Подключение к MongoDB
// Замени URL на свою строку подключения (локальную или из MongoDB Atlas)
// Подключение к MongoDB Atlas
// Если переменная окружения MONGO_URI не задана, используется строка по умолчанию
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('Успешно подключено к MongoDB Atlas'))
  .catch(err => console.error('Ошибка подключения к MongoDB:', err));
// ==========================================
// СХЕМЫ И МОДЕЛИ ДАННЫХ
// ==========================================

// Схема Пользователя
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true } // Твой пароль в открытом виде (как и был в исходнике)
});

const User = mongoose.model('User', UserSchema);

// Схема Карточки
const CardSchema = new mongoose.Schema({
  id: { type: Number, required: true }, // Сохраняем твой порядковый ID для фронтенда
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Ссылка на ObjectId пользователя
  question: { type: String, required: true },
  answer: { type: String, required: true }
});

const Card = mongoose.model('Card', CardSchema);

// ==========================================
// ЭНДПОИНТЫ API
// ==========================================

// 1. РЕГИСТРАЦИЯ
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Заполните все поля!' });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Пользователь с такой почтой уже существует' });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    // Возвращаем строковый _id как id для Angular
    res.status(201).json({ id: newUser._id, username: newUser.username });
  } catch (error) {
    res.status(500).json({ message: 'Внутренняя ошибка сервера при регистрации' });
  }
});

// 2. АВТОРИЗАЦИЯ (ВХОД)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Введите почту и пароль!' });
  }

  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ message: 'Неверная почта или пароль' });
    }

    // Возвращаем строковый _id как id для Angular
    res.json({ id: user._id, username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Внутренняя ошибка сервера при авторизации' });
  }
});

// 3. ПОЛУЧЕНИЕ КАРТОЧЕК
app.get('/api/cards', async (req, res) => {
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ message: 'userId не указан' });
  }

  try {
    // Находим все карточки, где userId совпадает с переданным ObjectId
    const userCards = await Card.find({ userId: userId });
    res.json(userCards);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении карточек' });
  }
});

// 4. СОХРАНЕНИЕ / СИНХРОНИЗАЦИЯ КАРТОЧЕК
app.post('/api/cards', async (req, res) => {
  const userId = req.query.userId;
  const newCards = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId не указан' });
  }

  try {
    // 1. Удаляем из базы все старые карточки этого пользователя
    await Card.deleteMany({ userId: userId });

    // 2. Если прилетел массив новых карточек, сохраняем их
    if (Array.isArray(newCards) && newCards.length > 0) {
      const preparedCards = newCards.map(card => ({
        id: card.id,
        question: card.question,
        answer: card.answer,
        userId: userId // Привязываем к Mongo ObjectId пользователя
      }));
      
      await Card.insertMany(preparedCards);
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при сохранении карточек' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});