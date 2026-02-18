# Сохранение темы страницы QR на бэкенде

## Что обновить

### 1. Модель клуба

Добавить поле (если ещё нет):

- **`qrPageTheme`** — объект с цветами страницы QR рулетки. Все значения — строки (hex или rgba).

Пример структуры:

```ts
qrPageTheme: {
  pageBg: string;
  spinContainerBg: string;
  spinnerLabel: string;
  spinnerValue: string;
  pointer: string;
  trackBg: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardPlaceholderBg: string;
  selectedCardBorder: string;
  winsChatBg: string;
  winsChatText: string;
  fullscreenBtnBg: string;
  fullscreenBtnText: string;
  fullscreenBtnBorder: string;
  resultOverlayBg: string;
  resultContentBg: string;
  resultTitle: string;
  resultPrizeText: string;
  loadingText: string;
  retryBtnBg: string;
  retryBtnText: string;
}
```

Можно хранить как вложенный объект (например, в MongoDB — в документе клуба). Бэкенд может отдавать тему **частично** — фронт мержит с дефолтом.

### 2. API

- **PATCH /clubs/me** — в теле запроса принимать опциональное поле `qrPageTheme` (объект выше). Сохранять в профиле клуба текущего пользователя.
- **GET /clubs/me** (или тот эндпоинт, который отдаёт клуб при логине/загрузке кабинета) — в ответ включать поле `qrPageTheme`, если оно сохранено.

После этого фронт уже вызывает `PATCH /clubs/me` с `{ qrPageTheme }` при нажатии «Сохранить» и подставляет тему из ответа `GET /clubs/me` на странице QR и в настройках.
