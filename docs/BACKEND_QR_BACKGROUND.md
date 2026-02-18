# Фон страницы QR (изображение/видео)

## Эндпоинты на бэкенде

### 1. Загрузка фона — POST /clubs/me/qr-background

- **Метод:** POST  
- **Авторизация:** Bearer (клуб)  
- **Content-Type:** multipart/form-data  
- **Тело:** поле `file` — файл (PNG, GIF, видео MP4/WebM).

**Требования к файлу:**

- Форматы: PNG, GIF, MP4, WebM.
- Объём: не более **10 МБ**.
- Рекомендуемый размер: **1920×1080** px (для видео и изображений).

**Ответ при успехе (200):**

```json
{ "url": "https://..." }
```

URL — публичная ссылка на загруженный файл (CDN или статика). Фронт сохраняет её через PATCH /clubs/me в поле `qrPageBackground.url`.

### 2. Сохранение фона и непрозрачности — PATCH /clubs/me

В теле запроса принимать опциональное поле:

- **qrPageBackground** — объект или `null`:
  - `url` (string) — ссылка на файл из POST /clubs/me/qr-background; пустая строка `""` = удалить фон.
  - `opacity` (number) — непрозрачность фона от 0 до 1 (0.5 = 50%).

Пример тела:

```json
{ "qrPageBackground": { "url": "https://...", "opacity": 0.6 } }
```

Чтобы убрать фон, фронт может отправить `{ "qrPageBackground": { "url": "", "opacity": 0.5 } }` или бэкенд может поддерживать `qrPageBackground: null`.

### 3. Ответ GET /clubs/me

В объекте клуба возвращать поле **qrPageBackground** (если задано):

```json
{
  "qrPageBackground": {
    "url": "https://...",
    "opacity": 0.6
  }
}
```

На странице /club/qr фронт подкладывает под контент `<img>` или `<video>` (по расширению URL) с `opacity` из этого объекта.
