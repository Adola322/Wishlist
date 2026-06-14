console.log("Сервер запускаю... нуща:) всё будет");
console.log("Если не работает - перезапусти");
// Тут я храню всех пользоватилей 
let users = [];
const express = require('express');
console.log("Запуск сервера... давай работай");
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_PATH = path.join(__dirname, 'database.json');


function initDB() {
    if (!fs.existsSync(DB_PATH)) {
        const initialData = {
            users: [
                { id: 1, name: 'Анна', email: 'anna@example.com', avatar: '👩', createdAt: new Date().toISOString() },
                { id: 2, name: 'Максим', email: 'max@example.com', avatar: '👨', createdAt: new Date().toISOString() }
            ],
            wishes: [
                { 
                    id: 1, 
                    userId: 1, 
                    title: 'MacBook Pro', 
                    description: '16 дюймов для работы', 
                    price: 150000, 
                    category: 'electronics', 
                    priority: 'high', 
                    status: 'pending',
                    image: '',
                    link: '',
                    createdAt: new Date().toISOString()
                },
                { 
                    id: 2, 
                    userId: 2, 
                    title: 'PlayStation 5', 
                    description: 'С двумя контроллерами', 
                    price: 60000, 
                    category: 'gaming', 
                    priority: 'high', 
                    status: 'pending',
                    image: '',
                    link: '',
                    createdAt: new Date().toISOString()
                }
            ],
            categories: [
                { id: 'electronics', name: 'Электроника', icon: '💻' },
                { id: 'gaming', name: 'Игры', icon: '🎮' },
                { id: 'books', name: 'Книги', icon: '📚' },
                { id: 'clothing', name: 'Одежда', icon: '👕' },
                { id: 'home', name: 'Дом', icon: '🏠' },
                { id: 'other', name: 'Другое', icon: '🎁' }
            ],
            counters: { users: 3, wishes: 3 }
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    }
}

function readDB() {
    const data = fs.readFileSync(DB_PATH);
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

initDB();




app.get('/api/users', (req, res) => {
    const data = readDB();
    res.json(data.users);
});


app.post('/api/users', (req, res) => {
    const data = readDB();
    const { name, email, avatar } = req.body;
    
    const newUser = {
        id: data.counters.users++,
        name: name,
        email: email,
        avatar: avatar || '👤',
        createdAt: new Date().toISOString()
    };
    
    data.users.push(newUser);
    writeDB(data);
    res.json(newUser);
});


app.delete('/api/users/:id', (req, res) => {
    const data = readDB();
    const userId = parseInt(req.params.id);
    
    data.users = data.users.filter(u => u.id !== userId);
    data.wishes = data.wishes.filter(w => w.userId !== userId);
    
    writeDB(data);
    res.json({ success: true });
});


app.get('/api/wishes', (req, res) => {
    const data = readDB();
    let wishes = [...data.wishes];
    
    
    if (req.query.userId) {
        wishes = wishes.filter(w => w.userId === parseInt(req.query.userId));
    }
    
    
    if (req.query.category && req.query.category !== 'all') {
        wishes = wishes.filter(w => w.category === req.query.category);
    }
    
    
    if (req.query.status && req.query.status !== 'all') {
        wishes = wishes.filter(w => w.status === req.query.status);
    }
    
    
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    wishes.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));
    
    
    wishes = wishes.map(wish => ({
        ...wish,
        user: data.users.find(u => u.id === wish.userId),
        categoryData: data.categories.find(c => c.id === wish.category)
    }));
    
    res.json(wishes);
});


app.get('/api/wishes/:id', (req, res) => {
    const data = readDB();
    const wish = data.wishes.find(w => w.id === parseInt(req.params.id));
    if (!wish) return res.status(404).json({ error: 'Not found' });
    
    res.json({
        ...wish,
        user: data.users.find(u => u.id === wish.userId)
    });
});


app.post('/api/wishes', (req, res) => {
    const data = readDB();
    const { userId, title, description, price, category, priority, link, image } = req.body;
    
    const newWish = {
        id: data.counters.wishes++,
        userId: parseInt(userId),
        title: title,
        description: description || '',
        price: price ? parseFloat(price) : 0,
        category: category || 'other',
        priority: priority || 'medium',
        status: 'pending',
        link: link || '',
        image: image || '',
        createdAt: new Date().toISOString()
    };
    
    data.wishes.push(newWish);
    writeDB(data);
    res.json(newWish);
});


app.put('/api/wishes/:id', (req, res) => {
    const data = readDB();
    const wishId = parseInt(req.params.id);
    const index = data.wishes.findIndex(w => w.id === wishId);
    
    if (index !== -1) {
        data.wishes[index] = { ...data.wishes[index], ...req.body };
        writeDB(data);
        res.json(data.wishes[index]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});


app.delete('/api/wishes/:id', (req, res) => {
    const data = readDB();
    const wishId = parseInt(req.params.id);
    data.wishes = data.wishes.filter(w => w.id !== wishId);
    writeDB(data);
    res.json({ success: true });
});


app.get('/api/stats', (req, res) => {
    const data = readDB();
    const totalWishes = data.wishes.length;
    const completedWishes = data.wishes.filter(w => w.status === 'completed').length;
    const totalPrice = data.wishes.reduce((sum, w) => sum + (w.price || 0), 0);
    const completionRate = totalWishes ? ((completedWishes / totalWishes) * 100).toFixed(1) : 0;
    
    const categoryStats = {};
    data.wishes.forEach(wish => {
        categoryStats[wish.category] = (categoryStats[wish.category] || 0) + 1;
    });
    
    res.json({
        totalWishes,
        completedWishes,
        completionRate,
        totalPrice,
        categoryStats,
        userStats: data.users.map(user => ({
            id: user.id,
            name: user.name,
            wishCount: data.wishes.filter(w => w.userId === user.id).length,
            completedCount: data.wishes.filter(w => w.userId === user.id && w.status === 'completed').length
        }))
    });
});


app.get('/api/categories', (req, res) => {
    const data = readDB();
    res.json(data.categories);
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║     🎁 WISHLIST SYSTEM v2.0 ЗАПУЩЕНА 🎁       ║
╠════════════════════════════════════════════════╣
║     🌐 http://localhost:${PORT}                  ║
║     📊 API: /api/stats                         ║
║     👥 Users: /api/users                       ║
╚════════════════════════════════════════════════╝
    `);
});
