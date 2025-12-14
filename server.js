const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require("bcrypt");
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

app.use(express.json());
app.use(cors());

// Проверка переменных окружения
if (!process.env.MONGODB_URL) {
    console.error('❌ ОШИБКА: MONGODB_URL не найден в .env файле!');
    process.exit(1);
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('⚠️ ВНИМАНИЕ: TELEGRAM_BOT_TOKEN не найден. Telegram бот не запустится.');
}

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('✅ Подключено к MongoDB'))
    .catch(err => {
        console.error('❌ Ошибка подключения к MongoDB:', err.message);
        process.exit(1);
    });

// Telegram Bot
let bot;
if (process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('✅ Telegram бот запущен');
}

// Схема пользователя
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    totalDonated: { type: Number, default: 0 },
    telegramChatId: String, // 🆕 для отправки уведомлений
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
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: String,
    description: String,
    images: {
        type: [String],
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

// Схема заявки на помощь
const helpRequestSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: String,
    userEmail: String,
    phone: String,
    telegramUsername: String, // 🆕 Telegram username для связи
    reason: { type: String, required: true },
    amount: { type: Number, required: true, max: 50000 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    approvedBy: String,
    approvedAt: Date,
    completedAt: Date,
    rejectionReason: String, // 🆕 причина отклонения
    createdAt: { type: Date, default: Date.now }
});

// Схема пожертвований
const donationSchema = new mongoose.Schema({
    donorId: { type: String, required: true },
    donorName: String,
    amount: { type: Number, required: true },
    message: String,
    isAnonymous: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const HelpRequest = mongoose.model('HelpRequest', helpRequestSchema);
const Donation = mongoose.model('Donation', donationSchema);

// === ПОЛЬЗОВАТЕЛИ ===

app.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

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

app.patch('/users/:id/balance', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const { amount, operation } = req.body;

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

// 🆕 Привязать Telegram к аккаунту
app.patch('/users/:id/telegram', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        user.telegramChatId = req.body.chatId;
        await user.save();

        res.json({
            success: true,
            message: 'Telegram успешно привязан!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                telegramConnected: !!user.telegramChatId
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// === ЛОГИН ===
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
                balance: user.balance,
                telegramConnected: !!user.telegramChatId
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === ПРОДУКТЫ ===

app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Продукт не найден' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/products/:id/comments', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Продукт не найден' });

        product.comments.push(req.body);

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

// === ПОКУПКА ===
app.post('/purchase', async (req, res) => {
    try {
        const { userId, productIds } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        const uniqueProducts = await Product.find({ _id: { $in: productIds } });

        if (uniqueProducts.length === 0) {
            return res.status(404).json({ error: 'Продукты не найдены' });
        }

        const allProducts = productIds.map(id => {
            const product = uniqueProducts.find(p => p._id.toString() === id);
            if (!product) throw new Error(`Продукт ${id} не найден`);
            return product;
        });

        const totalPrice = allProducts.reduce((sum, p) => sum + p.price, 0);

        if (user.balance < totalPrice) {
            return res.json({
                success: false,
                message: 'Недостаточно средств',
                required: totalPrice,
                available: user.balance,
                shortage: totalPrice - user.balance
            });
        }

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

app.get('/products/top/rating', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const products = await Product.find().sort({ rating: -1 }).limit(limit);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/users/:id/reviews', async (req, res) => {
    try {
        const userId = req.params.id;

        const products = await Product.find({ "comments.userId": userId });

        const userReviews = [];

        products.forEach(product => {
            product.comments
                .filter(comment => comment.userId === userId)
                .forEach(comment => {
                    userReviews.push({
                        productId: product._id,
                        productName: product.name,
                        rating: comment.rating,
                        text: comment.text,
                        date: comment.date
                    });
                });
        });

        res.json({
            success: true,
            total: userReviews.length,
            reviews: userReviews
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 🆕 СИСТЕМА ПОЖЕРТВОВАНИЙ
// ========================================

app.post('/donate', async (req, res) => {
    try {
        const { userId, amount, message, isAnonymous } = req.body;

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'userId и положительная сумма обязательны' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (user.balance < amount) {
            return res.json({
                success: false,
                message: 'Недостаточно средств для пожертвования',
                available: user.balance,
                required: amount
            });
        }

        user.balance -= amount;
        user.totalDonated += amount;
        await user.save();

        const donation = new Donation({
            donorId: userId,
            donorName: isAnonymous ? 'Аноним' : user.name,
            amount,
            message,
            isAnonymous
        });

        await donation.save();

        res.json({
            success: true,
            message: 'Спасибо за пожертвование!',
            donation: {
                amount,
                remainingBalance: user.balance,
                totalDonated: user.totalDonated
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/donations/stats', async (req, res) => {
    try {
        const totalDonations = await Donation.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const total = totalDonations.length > 0 ? totalDonations[0].total : 0;
        const count = await Donation.countDocuments();

        const topDonors = await Donation.aggregate([
            { $match: { isAnonymous: false } },
            { $group: { _id: '$donorId', name: { $first: '$donorName' }, total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        const recentDonations = await Donation.find()
            .sort({ date: -1 })
            .limit(20)
            .select('donorName amount message isAnonymous date');

        res.json({
            success: true,
            totalAmount: total,
            totalCount: count,
            topDonors: topDonors.map(d => ({
                name: d.name,
                totalDonated: d.total
            })),
            recentDonations
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/users/:id/donations', async (req, res) => {
    try {
        const donations = await Donation.find({ donorId: req.params.id })
            .sort({ date: -1 });

        const user = await User.findById(req.params.id);

        res.json({
            success: true,
            totalDonated: user ? user.totalDonated : 0,
            donations
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 🆕 ЗАЯВКИ НА ПОМОЩЬ
// ========================================

app.post('/help-request', async (req, res) => {
    try {
        const { userId, phone, telegramUsername, reason, amount } = req.body;

        if (!userId || !reason || !amount) {
            return res.status(400).json({ error: 'userId, reason и amount обязательны' });
        }

        if (amount > 50000) {
            return res.status(400).json({ error: 'Максимальная сумма запроса: 50,000 сум' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const existingRequest = await HelpRequest.findOne({
            userId,
            status: { $in: ['pending', 'approved'] }
        });

        if (existingRequest) {
            return res.status(400).json({
                error: 'У вас уже есть активная заявка',
                existingRequest
            });
        }

        const helpRequest = new HelpRequest({
            userId,
            userName: user.name,
            userEmail: user.email,
            phone,
            telegramUsername,
            reason,
            amount
        });

        await helpRequest.save();

        // Отправляем уведомление в Telegram админу
        if (bot && process.env.TELEGRAM_ADMIN_CHAT_ID) {
            const message = `
🆕 Новая заявка на помощь!

👤 Пользователь: ${user.name}
📧 Email: ${user.email}
📞 Телефон: ${phone || 'не указан'}
💬 Telegram: ${telegramUsername ? '@' + telegramUsername : 'не указан'}
💰 Сумма: ${amount.toLocaleString()} сум
📝 Причина: ${reason}

ID заявки: ${helpRequest._id}
            `;

            bot.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, message);
        }

        res.json({
            success: true,
            message: 'Заявка подана успешно! Ожидайте рассмотрения.',
            request: helpRequest
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/help-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status ? { status } : {};

        const requests = await HelpRequest.find(filter)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            total: requests.length,
            requests
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/users/:id/help-requests', async (req, res) => {
    try {
        const requests = await HelpRequest.find({ userId: req.params.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            requests
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/help-requests/:id', async (req, res) => {
    try {
        const { status, approvedBy, rejectionReason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'status должен быть approved или rejected' });
        }

        const request = await HelpRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'Заявка не найдена' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Заявка уже обработана' });
        }

        request.status = status;
        request.approvedBy = approvedBy;
        request.approvedAt = new Date();

        if (status === 'rejected') {
            request.rejectionReason = rejectionReason || 'Не указана';
        }

        // Если одобрено - переводим деньги
        if (status === 'approved') {
            const totalDonations = await Donation.aggregate([
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const availableFunds = totalDonations.length > 0 ? totalDonations[0].total : 0;

            const completedRequests = await HelpRequest.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const usedFunds = completedRequests.length > 0 ? completedRequests[0].total : 0;
            const remainingFunds = availableFunds - usedFunds;

            if (remainingFunds < request.amount) {
                return res.status(400).json({
                    error: 'Недостаточно средств в фонде пожертвований',
                    available: remainingFunds,
                    required: request.amount
                });
            }

            const user = await User.findById(request.userId);
            if (user) {
                user.balance += request.amount;
                await user.save();

                // 🆕 Отправляем уведомление пользователю
                if (user.telegramChatId && bot) {
                    const userMessage = `
✅ Ваша заявка на помощь одобрена!

💰 Сумма: ${request.amount.toLocaleString()} сум
📝 Причина: ${request.reason}

Деньги зачислены на ваш баланс.
Текущий баланс: ${user.balance.toLocaleString()} сум

Спасибо за использование нашего сервиса! 🙏
                    `;

                    try {
                        await bot.sendMessage(user.telegramChatId, userMessage);
                    } catch (telegramErr) {
                        console.error('Ошибка отправки Telegram:', telegramErr);
                    }
                }
            }

            request.status = 'completed';
            request.completedAt = new Date();
        } else {
            // 🆕 Отправляем уведомление об отклонении
            const user = await User.findById(request.userId);
            if (user && user.telegramChatId && bot) {
                const userMessage = `
❌ Ваша заявка на помощь отклонена

💰 Запрашиваемая сумма: ${request.amount.toLocaleString()} сум
📝 Причина запроса: ${request.reason}
❗ Причина отклонения: ${rejectionReason || 'Не указана'}

Вы можете подать новую заявку позже.
                `;

                try {
                    await bot.sendMessage(user.telegramChatId, userMessage);
                } catch (telegramErr) {
                    console.error('Ошибка отправки Telegram:', telegramErr);
                }
            }
        }

        await request.save();

        // Уведомление админу
        if (bot && process.env.TELEGRAM_ADMIN_CHAT_ID) {
            const statusText = status === 'approved' ? '✅ ОДОБРЕНА' : '❌ ОТКЛОНЕНА';
            bot.sendMessage(
                process.env.TELEGRAM_ADMIN_CHAT_ID,
                `${statusText}\n\nЗаявка ${request._id}\nПользователь: ${request.userName}\nСумма: ${request.amount.toLocaleString()} сум`
            );
        }

        res.json({
            success: true,
            message: `Заявка ${status === 'approved' ? 'одобрена' : 'отклонена'}`,
            request
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 🤖 TELEGRAM BOT
// ========================================

if (bot) {
    let currentRequestIndex = 0;
    let pendingRequests = [];

    const loadPendingRequests = async () => {
        pendingRequests = await HelpRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
        return pendingRequests;
    };

    // Команда /start
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;

        // Проверяем, является ли это админ
        if (chatId.toString() === process.env.TELEGRAM_ADMIN_CHAT_ID) {
            bot.sendMessage(chatId, `
🤖 Админ-панель системы пожертвований

Доступные команды:
/requests - Показать заявки
/stats - Статистика пожертвований
/help - Помощь
            `);
        } else {
            // Обычный пользователь - предлагаем привязать аккаунт
            bot.sendMessage(chatId, `
👋 Добро пожаловать!

Ваш Chat ID: ${chatId}

Чтобы получать уведомления о статусе ваших заявок:
1. Скопируйте ваш Chat ID выше
2. Перейдите в настройки вашего профиля на сайте
3. Добавьте Chat ID в разделе "Telegram уведомления"

После этого вы будете получать уведомления о:
✅ Одобрении заявок
❌ Отклонении заявок
💰 Зачислении средств
            `);
        }
    });

    // Команда /requests
    bot.onText(/\/requests/, async (msg) => {
        const chatId = msg.chat.id;

        if (chatId.toString() !== process.env.TELEGRAM_ADMIN_CHAT_ID) {
            bot.sendMessage(chatId, '❌ У вас нет доступа к этой команде');
            return;
        }

        await loadPendingRequests();

        if (pendingRequests.length === 0) {
            bot.sendMessage(chatId, '📭 Нет ожидающих заявок');
            return;
        }

        currentRequestIndex = 0;
        showRequest(chatId);
    });

    // Команда /stats
    bot.onText(/\/stats/, async (msg) => {
        const chatId = msg.chat.id;

        if (chatId.toString() !== process.env.TELEGRAM_ADMIN_CHAT_ID) {
            bot.sendMessage(chatId, '❌ У вас нет доступа к этой команде');
            return;
        }

        try {
            const totalDonations = await Donation.aggregate([
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const total = totalDonations.length > 0 ? totalDonations[0].total : 0;

            const completedRequests = await HelpRequest.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const used = completedRequests.length > 0 ? completedRequests[0].total : 0;

            const pending = await HelpRequest.countDocuments({ status: 'pending' });

            const message = `
📊 Статистика системы пожертвований

💰 Всего собрано: ${total.toLocaleString()} сум
✅ Выдано нуждающимся: ${used.toLocaleString()} сум
💵 Остаток в фонде: ${(total - used).toLocaleString()} сум

📋 Заявок на рассмотрении: ${pending}
            `;

            bot.sendMessage(chatId, message);
        } catch (err) {
            bot.sendMessage(chatId, '❌ Ошибка получения статистики: ' + err.message);
        }
    });

    const showRequest = (chatId) => {
        if (pendingRequests.length === 0 || currentRequestIndex >= pendingRequests.length) {
            bot.sendMessage(chatId, '📭 Все заявки просмотрены');
            return;
        }

        const request = pendingRequests[currentRequestIndex];

        const message = `
🆕 Заявка на помощь

👤 Пользователь: ${request.userName}
📧 Email: ${request.userEmail || 'не указан'}
📞 Телефон: ${request.phone || 'не указан'}
💬 Telegram: ${request.telegramUsername ? '@' + request.telegramUsername : 'не указан'}
💰 Сумма: ${request.amount.toLocaleString()} сум
📝 Причина: ${request.reason}

ID заявки: ${request._id}

Команды:
✅ /approve - Одобрить
❌ /reject - Отклонить
➡ /next - Следующая заявка
    `;

        bot.sendMessage(chatId, message);
    };

    // Одобрение заявки
    bot.onText(/\/approve/, async (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== process.env.TELEGRAM_ADMIN_CHAT_ID) return;

        if (!pendingRequests[currentRequestIndex]) {
            bot.sendMessage(chatId, '❌ Нет активной заявки');
            return;
        }

        const request = pendingRequests[currentRequestIndex];

        try {
            const user = await User.findById(request.userId);
            if (user) {
                user.balance += request.amount;
                await user.save();

                if (user.telegramChatId) {
                    await bot.sendMessage(user.telegramChatId, `✅ Ваша заявка на помощь одобрена. Сумма: ${request.amount.toLocaleString()} сум`);
                }
            }

            request.status = 'completed';
            request.completedAt = new Date();
            await request.save();

            bot.sendMessage(chatId, `✅ Заявка ${request._id} одобрена`);

            currentRequestIndex++;
            showRequest(chatId);
        } catch (err) {
            bot.sendMessage(chatId, '❌ Ошибка при одобрении заявки: ' + err.message);
        }
    });

    // Отклонение заявки
    bot.onText(/\/reject/, async (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== process.env.TELEGRAM_ADMIN_CHAT_ID) return;

        if (!pendingRequests[currentRequestIndex]) {
            bot.sendMessage(chatId, '❌ Нет активной заявки');
            return;
        }

        const request = pendingRequests[currentRequestIndex];

        try {
            request.status = 'rejected';
            request.rejectionReason = 'Отклонено администратором';
            request.approvedAt = new Date();
            await request.save();

            const user = await User.findById(request.userId);
            if (user && user.telegramChatId) {
                await bot.sendMessage(user.telegramChatId, `❌ Ваша заявка на помощь отклонена. Причина: ${request.rejectionReason}`);
            }

            bot.sendMessage(chatId, `❌ Заявка ${request._id} отклонена`);

            currentRequestIndex++;
            showRequest(chatId);
        } catch (err) {
            bot.sendMessage(chatId, '❌ Ошибка при отклонении заявки: ' + err.message);
        }
    });

    // Переход к следующей заявке
    bot.onText(/\/next/, async (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== process.env.TELEGRAM_ADMIN_CHAT_ID) return;

        currentRequestIndex++;
        showRequest(chatId);
    });
}