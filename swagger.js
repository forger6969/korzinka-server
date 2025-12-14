// swagger.js - Полная Swagger документация

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '💰 API системы пожертвований и помощи',
            version: '1.0.0',
            description: `
Полная документация API сервера благотворительной системы.

## Возможности системы:
- 👤 Регистрация и авторизация пользователей
- 📦 Управление продуктами и покупками
- 💰 Система пожертвований
- 🆘 Заявки на помощь нуждающимся
- 🤖 Telegram бот для уведомлений
- ⭐ Рейтинги и отзывы

## Валюта
Все суммы указаны в **узбекских сумах (UZS)**

## Аутентификация
В текущей версии используется передача userId в теле запроса.
В production рекомендуется использовать JWT токены.
      `,
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://api.example.com',
                description: 'Production server'
            }
        ],
        tags: [
            {
                name: 'Auth',
                description: '🔐 Регистрация и авторизация'
            },
            {
                name: 'Users',
                description: '👤 Управление пользователями'
            },
            {
                name: 'Products',
                description: '📦 Управление продуктами'
            },
            {
                name: 'Purchase',
                description: '🛒 Покупки и история'
            },
            {
                name: 'Reviews',
                description: '⭐ Отзывы пользователей'
            },
            {
                name: 'Donations',
                description: '💰 Пожертвования'
            },
            {
                name: 'Help Requests',
                description: '🆘 Заявки на помощь'
            }
        ],
        components: {
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        name: {
                            type: 'string',
                            example: 'Иван Иванов'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'ivan@example.com'
                        },
                        balance: {
                            type: 'number',
                            example: 150000,
                            description: 'Баланс в сумах'
                        },
                        totalDonated: {
                            type: 'number',
                            example: 50000,
                            description: 'Общая сумма пожертвований'
                        },
                        telegramChatId: {
                            type: 'string',
                            example: '123456789'
                        },
                        purchaseHistory: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Purchase'
                            }
                        }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            example: '607f1f77bcf86cd799439021'
                        },
                        name: {
                            type: 'string',
                            example: 'Ноутбук HP Pavilion'
                        },
                        price: {
                            type: 'number',
                            example: 5000000,
                            description: 'Цена в сумах'
                        },
                        category: {
                            type: 'string',
                            example: 'Электроника'
                        },
                        description: {
                            type: 'string',
                            example: 'Мощный ноутбук для работы и игр'
                        },
                        images: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            example: ['image1.jpg', 'image2.jpg']
                        },
                        rating: {
                            type: 'number',
                            format: 'float',
                            example: 4.5
                        },
                        comments: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Comment'
                            }
                        }
                    }
                },
                Comment: {
                    type: 'object',
                    properties: {
                        userId: {
                            type: 'string',
                            example: '507f1f77bcf86cd799439011'
                        },
                        userName: {
                            type: 'string',
                            example: 'Иван'
                        },
                        text: {
                            type: 'string',
                            example: 'Отличный товар!'
                        },
                        rating: {
                            type: 'number',
                            minimum: 1,
                            maximum: 5,
                            example: 5
                        },
                        date: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Purchase: {
                    type: 'object',
                    properties: {
                        products: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    productId: {
                                        type: 'string'
                                    },
                                    name: {
                                        type: 'string'
                                    },
                                    price: {
                                        type: 'number'
                                    }
                                }
                            }
                        },
                        totalPrice: {
                            type: 'number',
                            example: 5000000
                        },
                        date: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Donation: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string'
                        },
                        donorId: {
                            type: 'string'
                        },
                        donorName: {
                            type: 'string',
                            example: 'Иван'
                        },
                        amount: {
                            type: 'number',
                            example: 50000
                        },
                        message: {
                            type: 'string',
                            example: 'Хочу помочь нуждающимся'
                        },
                        isAnonymous: {
                            type: 'boolean',
                            example: false
                        },
                        date: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                HelpRequest: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string'
                        },
                        userId: {
                            type: 'string'
                        },
                        userName: {
                            type: 'string',
                            example: 'Мария'
                        },
                        userEmail: {
                            type: 'string',
                            example: 'maria@example.com'
                        },
                        phone: {
                            type: 'string',
                            example: '+998901234567'
                        },
                        telegramUsername: {
                            type: 'string',
                            example: 'maria_user'
                        },
                        reason: {
                            type: 'string',
                            example: 'Нужны деньги на операцию'
                        },
                        amount: {
                            type: 'number',
                            maximum: 50000,
                            example: 45000
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'approved', 'rejected', 'completed'],
                            example: 'pending'
                        },
                        approvedBy: {
                            type: 'string'
                        },
                        approvedAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        completedAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        rejectionReason: {
                            type: 'string'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            example: 'Описание ошибки'
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Операция выполнена успешно'
                        }
                    }
                }
            }
        }
    },
    apis: ['./server.js'] // Путь к вашему основному файлу
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = { swaggerUi, swaggerSpec };

// ============================================
// АННОТАЦИИ ДЛЯ SWAGGER В server.js
// Добавьте эти комментарии перед каждым эндпоинтом
// ============================================

/**
 * @swagger
 * /register:
 *   post:
 *     tags: [Auth]
 *     summary: 📝 Регистрация нового пользователя
 *     description: Создает нового пользователя с хешированным паролем
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Иван Иванов
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ivan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: securepassword123
 *     responses:
 *       200:
 *         description: Успешная регистрация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Регистрация успешна!
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Ошибка валидации или пользователь существует
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing_fields:
 *                 value:
 *                   error: Email и пароль обязательны
 *               user_exists:
 *                 value:
 *                   error: Пользователь с таким email уже существует
 */

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [Auth]
 *     summary: 🔑 Вход в систему
 *     description: Авторизация пользователя с проверкой пароля
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ivan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: securepassword123
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Успешный вход
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     balance:
 *                       type: number
 *                     telegramConnected:
 *                       type: boolean
 *       401:
 *         description: Неверный пароль
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: 👥 Получить всех пользователей
 *     description: Возвращает список всех пользователей без паролей
 *     responses:
 *       200:
 *         description: Список пользователей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Ошибка сервера
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: 👤 Получить пользователя по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /users/{id}/balance:
 *   put:
 *     tags: [Users]
 *     summary: 💰 Установить новый баланс
 *     description: Полностью заменяет баланс пользователя
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               balance:
 *                 type: number
 *                 example: 100000
 *     responses:
 *       200:
 *         description: Баланс обновлен
 *       404:
 *         description: Пользователь не найден
 *   patch:
 *     tags: [Users]
 *     summary: 💸 Изменить баланс
 *     description: Добавляет или вычитает сумму из текущего баланса
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 50000
 *               operation:
 *                 type: string
 *                 enum: [add, subtract]
 *                 example: add
 *     responses:
 *       200:
 *         description: Баланс изменен
 */

/**
 * @swagger
 * /users/{id}/telegram:
 *   patch:
 *     tags: [Users]
 *     summary: 📱 Привязать Telegram
 *     description: Привязывает Telegram Chat ID для уведомлений
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatId:
 *                 type: string
 *                 example: "123456789"
 *     responses:
 *       200:
 *         description: Telegram успешно привязан
 */

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: 📦 Получить все продукты
 *     responses:
 *       200:
 *         description: Список продуктов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *   post:
 *     tags: [Products]
 *     summary: ➕ Создать продукт
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ноутбук HP
 *               price:
 *                 type: number
 *                 example: 5000000
 *               category:
 *                 type: string
 *                 example: Электроника
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Продукт создан
 */

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: 🔍 Получить продукт по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Данные продукта
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Продукт не найден
 */

/**
 * @swagger
 * /products/{id}/comments:
 *   post:
 *     tags: [Products]
 *     summary: 💬 Добавить комментарий
 *     description: Добавляет комментарий и рейтинг к продукту
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               userName:
 *                 type: string
 *               text:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Комментарий добавлен
 */

/**
 * @swagger
 * /products/top/rating:
 *   get:
 *     tags: [Products]
 *     summary: ⭐ Топ продуктов по рейтингу
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Количество продуктов
 *     responses:
 *       200:
 *         description: Топ продуктов
 */

/**
 * @swagger
 * /purchase:
 *   post:
 *     tags: [Purchase]
 *     summary: 🛒 Совершить покупку
 *     description: Покупка одного или нескольких товаров
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["607f1f77bcf86cd799439021"]
 *     responses:
 *       200:
 *         description: Результат покупки
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                     totalPrice:
 *                       type: number
 *                     remainingBalance:
 *                       type: number
 *                     purchasedProducts:
 *                       type: array
 *                       items:
 *                         type: string
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                     required:
 *                       type: number
 *                     available:
 *                       type: number
 *                     shortage:
 *                       type: number
 */

/**
 * @swagger
 * /users/{id}/history:
 *   get:
 *     tags: [Purchase]
 *     summary: 📜 История покупок
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: История покупок пользователя
 */

/**
 * @swagger
 * /users/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: ⭐ Отзывы пользователя
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список отзывов пользователя
 */

/**
 * @swagger
 * /donate:
 *   post:
 *     tags: [Donations]
 *     summary: 💰 Сделать пожертвование
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 example: 50000
 *               message:
 *                 type: string
 *                 example: Хочу помочь!
 *               isAnonymous:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Результат пожертвования
 */

/**
 * @swagger
 * /donations/stats:
 *   get:
 *     tags: [Donations]
 *     summary: 📊 Статистика пожертвований
 *     description: Общая сумма, топ доноров, последние донаты
 *     responses:
 *       200:
 *         description: Статистика пожертвований
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalAmount:
 *                   type: number
 *                 totalCount:
 *                   type: number
 *                 topDonors:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recentDonations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Donation'
 */

/**
 * @swagger
 * /users/{id}/donations:
 *   get:
 *     tags: [Donations]
 *     summary: 💸 История пожертвований пользователя
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: История пожертвований
 */

/**
 * @swagger
 * /help-request:
 *   post:
 *     tags: [Help Requests]
 *     summary: 🆘 Подать заявку на помощь
 *     description: Максимальная сумма 50,000 сум
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - reason
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *               phone:
 *                 type: string
 *                 example: "+998901234567"
 *               telegramUsername:
 *                 type: string
 *                 example: "ivanov"
 *               reason:
 *                 type: string
 *                 example: "Нужны деньги на операцию"
 *               amount:
 *                 type: number
 *                 maximum: 50000
 *                 example: 45000
 *     responses:
 *       200:
 *         description: Заявка подана
 *       400:
 *         description: Ошибка валидации или активная заявка существует
 */

/**
 * @swagger
 * /help-requests:
 *   get:
 *     tags: [Help Requests]
 *     summary: 📋 Получить заявки
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, completed]
 *         description: Фильтр по статусу
 *     responses:
 *       200:
 *         description: Список заявок
 */

/**
 * @swagger
 * /users/{id}/help-requests:
 *   get:
 *     tags: [Help Requests]
 *     summary: 📝 Заявки пользователя
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Заявки пользователя
 */

/**
 * @swagger
 * /help-requests/{id}:
 *   patch:
 *     tags: [Help Requests]
 *     summary: ✅ Одобрить/отклонить заявку
 *     description: Только для администраторов
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               approvedBy:
 *                 type: string
 *                 example: "Администратор Иван"
 *               rejectionReason:
 *                 type: string
 *                 example: "Недостаточно документов"
 *     responses:
 *       200:
 *         description: Заявка обработана
 *       400:
 *         description: Ошибка обработки
 */