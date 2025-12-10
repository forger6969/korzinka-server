const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require("bcrypt");
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.json());

// Проверка переменных окружения
if (!process.env.MONGODB_URL) {
    console.error('❌ ОШИБКА: MONGODB_URL не найден в .env файле!');
    console.error('Создай файл .env и добавь строку подключения');
    process.exit(1);
}

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('✅ Подключено к MongoDB'))
    .catch(err => {
        console.error('❌ Ошибка подключения к MongoDB:', err.message);
        process.exit(1);
    });

// Схема пользователя
// Схема пользователя
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }, // 🔥 добавлено

    balance: { type: Number, default: 0 },

    purchaseHistory: [{
        products: [{
            productId: String,
            name: String,
            price: Number
        }],
        totalPrice: Number,
        date: { type: Date, default: Date.now }
    }]
});


// Схема продукта
// Схема продукта
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: String,
    description: String,

    // 🆕 Добавлено
    images: {
        type: [String],   // массив ссылок
        default: []
    },

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

// === РЕГИСТРАЦИЯ ===
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const candidate = await User.findOne({ email });
        if (candidate) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }


        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            balance: 0
        });

        await user.save();

        res.json({
            success: true,
            message: 'Регистрация успешна!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// === ЛОГИН (email + password) ===
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверяем пароль
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Неверный пароль' });
        }

        res.json({
            success: true,
            message: 'Успешный вход',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                balance: user.balance
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
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
// === ПОКУПКА (исправленный вариант с поддержкой повторяющихся товаров) ===
app.post('/purchase', async (req, res) => {
    try {
        const { userId, productIds } = req.body;

        // Находим пользователя
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        // Находим уникальные продукты (Mongo возвращает уникальные документы)
        const uniqueProducts = await Product.find({ _id: { $in: productIds } });

        if (uniqueProducts.length === 0) {
            return res.status(404).json({ error: 'Продукты не найдены' });
        }

        // Воссоздаём полный список с учётом повторений
        const allProducts = productIds.map(id => {
            const product = uniqueProducts.find(p => p._id.toString() === id);
            if (!product) throw new Error(`Продукт ${id} не найден`);
            return product;
        });

        // Считаем общую стоимость
        const totalPrice = allProducts.reduce((sum, p) => sum + p.price, 0);

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
            products: allProducts.map(p => ({
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
            purchasedProducts: allProducts.map(p => p.name)
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
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});