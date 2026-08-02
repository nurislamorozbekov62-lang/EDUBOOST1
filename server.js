const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('.'));

// Глобальная база данных в памяти сервера
let studentBalance = 200; // Начальный баланс ученика

// Начальный список заданий (квестов), которые разместил учитель
let questsStorage = [
    { id: 1, title: "🌲 Посадить дерево возле школы", points: 300, description: "Сделайте фото процесса и готового саженца." },
    { id: 2, title: "🧪 Лабораторная по химии (Опыты)", points: 150, description: "Проведите домашний опыт с содой и уксусом, запишите реакцию." },
    { id: 3, title: "🏆 Участие в школьной олимпиаде", points: 500, description: "Загрузите фото вашего бланка участника или сертификата." }
];

// Список отправленных отчётов на проверку
let reportsStorage = [];

// Список товаров в магазине призов
let shopItems = [
    { id: 1, name: "🚀 Фирменная футболка EduBoost", price: 400 },
    { id: 2, name: "🎟️ Сертификат на пробный ОРТ", price: 200 },
    { id: 3, name: "📓 Крутой блокнот и ручка", price: 100 }
];

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

// Ученик получает баланс
app.get('/api/balance', (req, res) => { res.json({ balance: studentBalance }); });

// Получить список всех доступных квестов от учителя
app.get('/api/quests/list', (req, res) => { res.json(questsStorage); });

// Учитель создает новое задание (квест)
app.post('/api/quests/create', (req, res) => {
    const { title, description, points } = req.body;
    const newQuest = {
        id: Date.now(),
        title,
        description,
        points: parseInt(points)
    };
    questsStorage.push(newQuest);
    res.json({ success: true, message: "Новое задание успешно размещено на доске!" });
});

// Ученик отправляет фотоотчёт по конкретному заданию
app.post('/api/reports/submit', (req, res) => {
    const { questId, questTitle, fileUrl, comment } = req.body;
    const newReport = {
        id: Date.now(),
        questId: parseInt(questId),
        questTitle,
        comment: comment || "Без комментария",
        fileUrl: fileUrl || "https://unsplash.com", // Красивое дефолтное фото выполнения
        status: "Ожидает проверки",
        points: 0
    };
    reportsStorage.push(newReport);
    res.json({ success: true, message: "Фотоотчёт успешно отправлен учителю!" });
});

// Учитель получает список отчётов для проверки
app.get('/api/reports/list', (req, res) => { res.json(reportsStorage); });

// Учитель утверждает отчёт и начисляет фиксированные баллы за квест
app.post('/api/reports/approve', (req, res) => {
    const { reportId } = req.body;
    const report = reportsStorage.find(r => r.id === parseInt(reportId));
    
    if (report && report.status === "Ожидает проверки") {
        const linkedQuest = questsStorage.find(q => q.id === report.questId);
        const rewardPoints = linkedQuest ? linkedQuest.points : 100; // Берем баллы из задания
        
        report.status = "Выполнено";
        report.points = rewardPoints;
        studentBalance += rewardPoints; // Начисляем баллы на баланс ученика
        
        res.json({ success: true, newBalance: studentBalance });
    } else {
        res.status(400).json({ success: false, message: "Отчёт не найден или уже проверен." });
    }
});

// Магазин призов
app.post('/api/shop/buy', (req, res) => {
    const { itemId } = req.body;
    const item = shopItems.find(i => i.id === parseInt(itemId));
    if (studentBalance >= item.price) {
        studentBalance -= item.price;
        res.json({ success: true, message: `Куплено: ${item.name}!`, newBalance: studentBalance });
    } else {
        res.json({ success: false, message: "Недостаточно баллов!" });
    }
});

app.listen(PORT, () => { console.log(`Платформа заведена на http://localhost:${PORT}`); });