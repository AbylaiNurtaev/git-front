# Интеграция recentWins на бэкенде

Утилита `utils/recentWins.js` хранит последние 10 выигрышей по клубу в памяти (маска телефона + название приза). Скопируйте её в свой бэкенд-репозиторий и подключите так:

## 1. POST /api/players/spin

После успешного спина (до ответа клиенту):

```js
const { addWin } = require('./utils/recentWins'); // или ваш путь

// clubId — id клуба, к которому привязан спин
// playerPhone — телефон игрока из запроса/сессии
// prizeName — название выигранного приза
const recentWins = addWin(clubId, playerPhone, prizeName);
```

`addWin` добавляет запись и возвращает обновлённый список (до 10 элементов). Его нужно передать в сокет при эмите `spin`.

## 2. Событие spin в Socket.IO

При каждом спинe в комнату клуба отправляйте payload с полем `recentWins`:

```js
const { getRecentWins } = require('./utils/recentWins');

// После сохранения спина и вызова addWin(clubId, playerPhone, prizeName):
io.to(roomByClubId[clubId]).emit('spin', {
  _id: spin._id,
  prize: { name: prize.name, slotIndex: prize.slotIndex, image: prize.image, /* ... */ },
  playerPhone: playerPhone,
  createdAt: spin.createdAt,
  recentWins: getRecentWins(clubId), // или результат addWin выше
});
```

Формат элемента `recentWins`:

- `maskedPhone`: `"+7 771 *** 3738"`
- `prizeName`: `"100 баллов"`
- `text`: `"+7 771 *** 3738 выиграл 100 баллов"`

Фронт `/club/qr` отображает список из `payload.recentWins` в чате побед.
