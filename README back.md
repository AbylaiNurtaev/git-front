# PC Backend - Платформа компьютерных клубов с рулеткой

Backend система для управления компьютерными клубами с системой рулетки и призов.

## Технологии

- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT для аутентификации
- QRCode для генерации QR-кодов

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
PORT=3000
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

3. Запустите сервер:
```bash
npm run dev
```

## Структура проекта

```
pc-back/
├── config/
│   └── database.js          # Подключение к MongoDB
├── controllers/
│   ├── adminController.js   # Контроллеры для администратора
│   ├── clubController.js    # Контроллеры для клубов
│   └── playerController.js  # Контроллеры для игроков
├── middleware/
│   └── auth.js              # Middleware для аутентификации
├── models/
│   ├── User.js              # Модель пользователя
│   ├── Club.js              # Модель клуба
│   ├── Prize.js             # Модель приза
│   ├── Spin.js              # Модель спина
│   ├── Transaction.js       # Модель транзакции
│   └── PrizeClaim.js        # Модель заявки на приз
├── routes/
│   ├── adminRoutes.js       # Роуты администратора
│   ├── clubRoutes.js        # Роуты клубов
│   └── playerRoutes.js      # Роуты игроков
├── utils/
│   ├── generateToken.js     # Генерация JWT токена
│   └── roulette.js          # Логика рулетки
├── server.js                # Основной файл сервера
└── package.json
```

## Роли пользователей

### Игрок (Player)
- Регистрация и авторизация по телефону (код: 0000)
- Получение 10 баллов при регистрации
- Прокрутка рулетки за 20 баллов
- Просмотр баланса и истории транзакций
- Просмотр выигранных призов
- Сканирование QR-кода клуба

### Клуб (Club)
- Личный кабинет
- Просмотр игроков клуба
- Статистика игроков
- Подтверждение выдачи физических призов
- Управление временем в клубе
- Просмотр отчетов

### Администратор (Admin)
- Управление клубами (создание, редактирование, удаление)
- Управление пользователями
- Создание и управление призами (до 25 слотов)
- Настройка процента выпадения призов
- Просмотр аналитики
- Управление лимитами и фондом призов
- Просмотр логов

## API Endpoints

### Игроки

**POST /api/players/register** - Регистрация игрока
```json
// Request
{ "phone": "+79991234567", "code": "0000" }

// Response
{
  "_id": "...",
  "phone": "+79991234567",
  "balance": 10,
  "role": "player",
  "token": "jwt_token"
}
```

**POST /api/players/login** - Авторизация игрока
```json
// Request
{ "phone": "+79991234567", "code": "0000" }

// Response
{
  "_id": "...",
  "phone": "+79991234567",
  "balance": 10,
  "role": "player",
  "clubId": null,
  "token": "jwt_token"
}
```

**GET /api/players/me** - Информация о текущем игроке
```json
// Headers: Authorization: Bearer {token}
// Response
{
  "_id": "...",
  "phone": "+79991234567",
  "balance": 10,
  "role": "player",
  "clubId": { "name": "Клуб", "clubId": "club_123" }
}
```

**GET /api/players/balance** - Баланс игрока
```json
// Response
{ "balance": 10 }
```

**GET /api/players/transactions** - История транзакций
```json
// Response
[
  {
    "_id": "...",
    "type": "registration_bonus",
    "amount": 10,
    "description": "Бонус за регистрацию",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**GET /api/players/club-by-qr/:qrToken** - Получить клуб по QR токену
```json
// Response
{
  "_id": "...",
  "name": "Клуб",
  "clubId": "club_123",
  "qrToken": "uuid_token"
}
```

**POST /api/players/spin** - Прокрутить рулетку
```json
// Request
{ "clubId": "club_id" }

// Response
{
  "spin": {
    "_id": "...",
    "prize": {
      "name": "100 баллов",
      "type": "points",
      "value": 100
    },
    "cost": 20,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "newBalance": 90
}
```

**GET /api/players/prizes** - Выигранные призы
```json
// Response
[
  {
    "_id": "...",
    "prizeId": { "name": "Приз", "type": "physical" },
    "clubId": { "name": "Клуб" },
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**POST /api/players/attach-club** - Привязать к клубу
```json
// Request
{ "clubId": "club_id" }

// Response
{ "message": "Игрок привязан к клубу", "clubId": "club_id" }
```

### Клубы

**POST /api/clubs/login** - Авторизация клуба
```json
// Request
{ "phone": "+79991234567", "code": "0000" }

// Response
{
  "_id": "...",
  "phone": "+79991234567",
  "role": "club",
  "club": { "name": "Клуб", "clubId": "club_123" },
  "token": "jwt_token"
}
```

**GET /api/clubs/me** - Информация о клубе
```json
// Response
{
  "_id": "...",
  "name": "Клуб",
  "clubId": "club_123",
  "qrToken": "uuid_token",
  "qrCode": "data:image/png;base64,...",
  "address": "Адрес"
}
```

**GET /api/clubs/players** - Игроки клуба
```json
// Response
[
  {
    "_id": "...",
    "phone": "+79991234567",
    "balance": 10,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**GET /api/clubs/players/stats** - Статистика игроков
```json
// Response
{
  "totalPlayers": 50,
  "totalSpins": 200,
  "totalSpent": 4000
}
```

**GET /api/clubs/prize-claims** - Заявки на призы
```json
// Response
[
  {
    "_id": "...",
    "userId": { "phone": "+79991234567" },
    "prizeId": { "name": "Приз", "type": "physical" },
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**PUT /api/clubs/prize-claims/:claimId/confirm** - Подтвердить приз
```json
// Request
{ "notes": "Выдан" }

// Response
{
  "message": "Приз подтвержден",
  "claim": { "status": "confirmed", ... }
}
```

**PUT /api/clubs/prize-claims/:claimId/club-time** - Управление временем в клубе
```json
// Request
{ "action": "activate" }

// Response
{
  "message": "Время в клубе обновлено",
  "claim": { "status": "confirmed", ... }
}
```

**GET /api/clubs/reports** - Отчеты по активности
```json
// Query: ?startDate=2024-01-01&endDate=2024-01-31
// Response
{
  "spins": [...],
  "claims": [...],
  "totalSpins": 200,
  "totalClaims": 50
}
```

### Администратор

**POST /api/admin/login** - Авторизация администратора
```json
// Request
{ "phone": "+79991234567", "code": "0000" }

// Response
{
  "_id": "...",
  "phone": "+79991234567",
  "role": "admin",
  "token": "jwt_token"
}
```

**POST /api/admin/clubs** - Создать клуб
```json
// Request
{ "name": "Клуб", "phone": "+79991234567", "address": "Адрес" }

// Response
{
  "_id": "...",
  "name": "Клуб",
  "clubId": "club_123",
  "qrToken": "uuid_token",
  "qrCode": "data:image/png;base64,..."
}
```

**GET /api/admin/clubs** - Все клубы
```json
// Response
[
  {
    "_id": "...",
    "name": "Клуб",
    "ownerId": { "phone": "+79991234567" },
    "isActive": true
  }
]
```

**PUT /api/admin/clubs/:id** - Обновить клуб
```json
// Request
{ "name": "Новое название", "isActive": false }

// Response
{ "_id": "...", "name": "Новое название", "isActive": false, ... }
```

**DELETE /api/admin/clubs/:id** - Удалить клуб
```json
// Response
{ "message": "Клуб удален" }
```

**GET /api/admin/users** - Все пользователи
```json
// Query: ?role=player
// Response
[
  {
    "_id": "...",
    "phone": "+79991234567",
    "role": "player",
    "balance": 10,
    "clubId": { "name": "Клуб" }
  }
]
```

**PUT /api/admin/users/:id** - Обновить пользователя
```json
// Request
{ "balance": 100, "isActive": true }

// Response
{ "_id": "...", "balance": 100, "isActive": true, ... }
```

**DELETE /api/admin/users/:id** - Удалить пользователя
```json
// Response
{ "message": "Пользователь удален" }
```

**POST /api/admin/prizes** - Создать приз
```json
// Request
{
  "name": "100 баллов",
  "type": "points",
  "value": 100,
  "dropChance": 10,
  "slotIndex": 0,
  "totalQuantity": 100
}

// Response
{
  "_id": "...",
  "name": "100 баллов",
  "type": "points",
  "value": 100,
  "dropChance": 10,
  "slotIndex": 0,
  "remainingQuantity": 100
}
```

**GET /api/admin/prizes** - Все призы
```json
// Response
[
  {
    "_id": "...",
    "name": "100 баллов",
    "type": "points",
    "dropChance": 10,
    "slotIndex": 0,
    "isActive": true
  }
]
```

**PUT /api/admin/prizes/:id** - Обновить приз
```json
// Request
{ "dropChance": 15, "isActive": false }

// Response
{ "_id": "...", "dropChance": 15, "isActive": false, ... }
```

**DELETE /api/admin/prizes/:id** - Удалить приз
```json
// Response
{ "message": "Приз удален" }
```

**GET /api/admin/analytics** - Аналитика
```json
// Query: ?startDate=2024-01-01&endDate=2024-01-31
// Response
{
  "totalUsers": 1000,
  "totalClubs": 50,
  "totalSpins": 5000,
  "totalPrizes": 25,
  "totalSpent": 100000,
  "prizeStats": [
    { "prizeName": "100 баллов", "count": 500 }
  ],
  "clubStats": [
    { "clubName": "Клуб", "count": 100 }
  ]
}
```

**PUT /api/admin/prize-fund** - Управление фондом призов
```json
// Request
{ "prizeId": "prize_id", "totalQuantity": 200, "remainingQuantity": 150 }

// Response
{
  "_id": "...",
  "totalQuantity": 200,
  "remainingQuantity": 150
}
```

**GET /api/admin/logs** - Логи
```json
// Query: ?type=spin_cost&startDate=2024-01-01
// Response
{
  "transactions": [
    {
      "_id": "...",
      "type": "spin_cost",
      "amount": -20,
      "userId": { "phone": "+79991234567" }
    }
  ],
  "spins": [
    {
      "_id": "...",
      "userId": { "phone": "+79991234567" },
      "clubId": { "name": "Клуб" },
      "prizeId": { "name": "Приз" }
    }
  ]
}
```

## Механика работы

1. Игрок регистрируется по телефону с кодом 0000
2. При регистрации получает 10 баллов
3. Игрок сканирует QR-код клуба
4. При прокрутке рулетки списывается 20 баллов
5. Система выбирает приз на основе вероятностей
6. Приз фиксируется в контексте клуба
7. Клуб подтверждает выдачу физических призов

## Типы призов

- `physical` - Физический приз (требует подтверждения клубом)
- `points` - Баллы (начисляются автоматически)
- `club_time` - Время в клубе (управляется клубом)
- `other` - Другие типы призов
