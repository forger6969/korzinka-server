const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Схема пользователя
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    purchaseHistory: [{
        products: [{ productId: String, name: String, price: Number }],
        totalPrice: Number,
        date: { type: Date, default: Date.now }
    }]
});

// Схема продукта
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: String,
    description: String,
    rating: { type: Number, default: 0 },
    comments: [{
        userId: String,
        userName: String,
        text: String,
        rating: Number,
        date: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// === ПОЛЬЗОВАТЕЛИ ===

// Получить всех пользователей
app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить пользователя по ID
app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создать пользователя
app.post('/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Обновить баланс (PUT - полная замена)
app.put('/users/:id/balance', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        user.balance = req.body.balance;
        await user.save();
        res.json({ message: 'Баланс обновлен', user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Изменить баланс (PATCH - частичное изменение)
app.patch('/users/:id/balance', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const { amount, operation } = req.body; // operation: 'add' или 'subtract'

        if (operation === 'add') {
            user.balance += amount;
        } else if (operation === 'subtract') {
            user.balance -= amount;
        }

        await user.save();
        res.json({ message: 'Баланс изменен', user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// === ПРОДУКТЫ ===

// Получить все продукты
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить продукт по ID
app.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Продукт не найден' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создать продукт
app.post('/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Добавить комментарий к продукту
app.post('/products/:id/comments', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Продукт не найден' });

        product.comments.push(req.body);

        // Пересчитываем средний рейтинг
        const ratings = product.comments.map(c => c.rating).filter(r => r);
        if (ratings.length > 0) {
            product.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        }

        await product.save();
        res.json({ message: 'Комментарий добавлен', product });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// === ПОКУПКА (BONUS!) ===

// Проверка возможности покупки и её совершение
app.post('/purchase', async (req, res) => {
    try {
        const { userId, productIds } = req.body;

        // Находим пользователя
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        // Находим все продукты
        const products = await Product.find({ _id: { $in: productIds } });
        if (products.length !== productIds.length) {
            return res.status(404).json({ error: 'Некоторые продукты не найдены' });
        }

        // Вычисляем общую стоимость
        const totalPrice = products.reduce((sum, p) => sum + p.price, 0);

        // Проверяем баланс
        if (user.balance < totalPrice) {
            return res.json({
                success: false,
                message: 'Недостаточно средств',
                required: totalPrice,
                available: user.balance,
                shortage: totalPrice - user.balance
            });
        }

        // Совершаем покупку
        user.balance -= totalPrice;
        user.purchaseHistory.push({
            products: products.map(p => ({
                productId: p._id,
                name: p.name,
                price: p.price
            })),
            totalPrice
        });

        await user.save();

        res.json({
            success: true,
            message: 'Покупка успешно совершена!',
            totalPrice,
            remainingBalance: user.balance,
            purchasedProducts: products.map(p => p.name)
        });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// История покупок пользователя (BONUS!)
app.get('/users/:id/history', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        res.json({
            userName: user.name,
            currentBalance: user.balance,
            purchaseHistory: user.purchaseHistory
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Топ продуктов по рейтингу (BONUS!)
app.get('/products/top/rating', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const products = await Product.find().sort({ rating: -1 }).limit(limit);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});