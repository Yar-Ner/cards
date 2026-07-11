const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// Хостинг сам передаст порт в переменную process.env.PORT. Если её нет — включится 3000
const PORT = process.env.PORT || 3000;

// Путь к твоему JSON файлу с карточками
const jsonFilePath = path.join(__dirname, 'data.json'); 

// Настраиваем middleware
app.use(cors()); // Разрешаем запросы с фронтенда (Angular)
app.use(express.json()); // Включаем поддержку чтения JSON из тела запроса (body)

// 1. GET: Отдаем карточки из JSON файла
app.get('/api/cards', (req, res) => {
  fs.readFile(jsonFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Ошибка чтения файла:', err);
      return res.status(500).json({ error: 'Не удалось прочитать базу данных' });
    }
    
    // Парсим строку из файла в JS-массив и отправляем на фронт
    try {
      const cards = JSON.parse(data || '[]');
      res.json(cards);
    } catch (parseErr) {
      res.status(500).json({ error: 'Файл JSON поврежден' });
    }
  });
});

// 2. POST: Принимаем обновленный массив от Angular и полностью перезаписываем JSON
app.post('/api/cards', (req, res) => {
  const updatedCards = req.body; // Тут лежит массив cards, прилетевший из Angular

  // Превращаем массив обратно в красивую строку JSON
  const jsonString = JSON.stringify(updatedCards, null, 2);

  fs.writeFile(jsonFilePath, jsonString, 'utf8', (err) => {
    if (err) {
      console.error('Ошибка записи в файл:', err);
      return res.status(500).json({ error: 'Не удалось сохранить данные' });
    }
    
    console.log('Файл cards.json успешно обновлен!');
    res.status(200).json({ message: 'Данные успешно синхронизированы' });
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен и ждет запросов на http://localhost:${PORT}`);
});