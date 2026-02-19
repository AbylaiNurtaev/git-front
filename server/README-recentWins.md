# Интеграция recentWins на бэкенде

Утилита `utils/recentWins.js` хранит последние 10 выигрышей по клубу (имя игрока, маска телефона, приз). На странице /club/qr выводится **«Имя выиграл Приз»** — для этого в каждую запись нужно передавать имя игрока.

## 1. POST /api/players/spin

После успешного спина (до ответа клиенту) вызовите `addWin` и передайте **имя игрока** (из user/player):

```js
const { addWin } = require('./utils/recentWins'); // или ваш путь

// clubId — id клуба, к которому привязан спин
// playerPhone — телефон игрока из запроса/сессии
// prizeName — название выигранного приза
// playerName — имя игрока (user.name, user.fio, player.name и т.п.), чтобы на /club/qr было «Имя выиграл Приз»
const playerName = req.user?.name ?? req.user?.fio ?? req.player?.name ?? '';
const recentWins = addWin(clubId, playerPhone, prizeName, playerName);
```

`addWin` добавляет запись и возвращает обновлённый список (до 10 элементов). Его нужно передать в сокет при эмите `spin`.

## 2. Событие spin в Socket.IO

При каждом спине в комнату клуба отправляйте payload с полем `recentWins` и **playerName** в payload:

```js
const { getRecentWins } = require('./utils/recentWins');

// После сохранения спина и вызова addWin(clubId, playerPhone, prizeName, playerName):
io.to(roomByClubId[clubId]).emit('spin', {
  _id: spin._id,
  prize: { name: prize.name, slotIndex: prize.slotIndex, image: prize.image, /* ... */ },
  playerPhone: playerPhone,
  playerName: playerName,   // имя выигравшего — на /club/qr будет «Имя выиграл Приз»
  createdAt: spin.createdAt,
  recentWins: getRecentWins(clubId), // каждый элемент уже содержит playerName, если передали в addWin
});
```

Формат элемента `recentWins` (чтобы выводилось имя, а не телефон):

- **`playerName`** (или **`name`**): `"Абылай"` — отображаемое имя игрока
- `maskedPhone`: `"+7 771 *** 3738"`
- `prizeName`: `"100 баллов"`

Фронт `/club/qr` выводит строку вида «{playerName} выиграл {prizeName}». Если `playerName` нет — показывается телефон.
