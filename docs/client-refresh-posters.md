# Client: refresh постеров аниме (`refresh-posters`)

Спека для iOS / Android / Web. Клиент вызывает эндпоинт, когда постер аниме **реально сломан** (не грузится / битый URL вроде `https://source2`). Бекенд проверяет URL, при необходимости удаляет недоступные постеры и синхронизирует аниме из YummyAnime (метаданные + постеры + эпизоды и связанное).

## Endpoints

```http
POST /api/animes/{animeId}/refresh-posters
POST /api/v1/animes/{animeId}/refresh-posters
```

Оба эквивалентны по смыслу (разный envelope ответа: legacy vs v1).

- Auth **не обязателен**
- Body **пустой**
- Path: `animeId` — внутренний ID аниме (`Int`)

---

## Когда вызывать

Вызывать **только** если:

1. Клиент уже получил аниме (каталог / детали).
2. Хотя бы один URL из `poster[]` не загрузился (network/HTTP error, пустой/битый host, например `https://source2`).
3. Для этого `animeId` ещё нет активного cooldown (см. ниже).

Не вызывать:

- «на всякий случай» при каждом открытии карточки;
- батчем по всему каталогу / спискам;
- в цикле по всем `animeId`;
- повторно сразу после `cooldown: true` или `429`.

Рекомендуемый UX: один retry на аниме за сессию показа; при `cooldown` / `429` — показать placeholder и не дёргать API.

---

## Success — `200`

### Legacy (`/api/...`)

```json
{
  "deletedCount": 1,
  "refreshed": true,
  "animeUpdated": true,
  "cooldown": false,
  "retryAfterSeconds": 0,
  "postersCreated": 1,
  "posters": [
    {
      "source": "//imgproxy.yani.tv/...",
      "preview": "//imgproxy.yani.tv/...",
      "thumbnail": "//imgproxy.yani.tv/...",
      "optimized": "//imgproxy.yani.tv/..."
    }
  ]
}
```

### v1 (`/api/v1/...`)

Тот же payload в `data`, плюс `meta.animeId`.

| Поле | Тип | Описание |
|------|-----|----------|
| `deletedCount` | int | Сколько недоступных poster-image удалено |
| `refreshed` | bool | Была попытка обновить данные из YummyAnime |
| `animeUpdated` | bool | Полный sync аниме через YummyAnime прошёл (`true` только при полном sync) |
| `cooldown` | bool | Запрос попал в per-anime cooldown: тяжёлая работа **не** выполнялась |
| `retryAfterSeconds` | int | Через сколько секунд имеет смысл повторять (0 если можно сейчас) |
| `postersCreated` | int | Служебный счётчик (обычно `0` или `1`) |
| `posters` | array | Актуальные постеры после обработки (могут быть protocol-relative `//…`) |

### Поведение бекенда

1. Если для `animeId` активен cooldown → сразу `200` с текущими постерами, `cooldown: true`, без HEAD/Yummy.
2. Иначе: HEAD/GET проверка URL постеров → удаление недоступных.
3. Если постеры удалены или их нет → полный sync из YummyAnime (`animeUpdated: true`).
4. В конце ответа — актуальный список `posters`.

После успешной обработки (и при cooldown-hit) клиент должен использовать `posters` из ответа (или перезапросить карточку аниме) вместо старых URL.

CDN host в UI по-прежнему нормализуется через `X-Image-CDN` — см. [client-image-cdn.md](client-image-cdn.md).

---

## Ограничения (обязательно учитывать на клиенте)

### 1) Per-IP rate limit

Лимит на IP (по умолчанию **10 запросов / 60 секунд** на этот эндпоинт).

При превышении:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1710000000
```

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 42
}
```

Клиент: остановить очередь refresh, ждать `Retry-After` / `retry_after`, не ретраить сразу.

### 2) Per-anime cooldown

Глобально на сервере (по умолчанию **15 минут** на один `animeId`).

Если аниме уже недавно обновляли (любым клиентом):

- статус всё равно `200`;
- `cooldown: true`;
- `refreshed: false`, `animeUpdated: false`;
- `retryAfterSeconds` > 0;
- заголовок `Retry-After` может быть выставлен.

Это защита от шторма: много пользователей с одним битым постером не должны каждый раз бить Yummy API.

### 3) Что это значит для реализации

| Ситуация | Действие клиента |
|----------|------------------|
| `200` + `animeUpdated: true` / новые `posters` | Обновить UI постеров |
| `200` + `cooldown: true` | Не повторять до `retryAfterSeconds`; можно показать текущие `posters` |
| `429` | Глобально поставить паузу refresh на `retry_after` секунд |
| `400` invalid id | Баг клиента — не слать |
| `5xx` | Один отложенный retry с backoff; не крутить каталог |

---

## Примеры

### Сломанный постер

```http
POST /api/v1/animes/12345/refresh-posters
```

→ `200`, возможно `animeUpdated: true`, новые URL в `posters`.

### Повтор сразу после успеха

```http
POST /api/v1/animes/12345/refresh-posters
```

→ `200`, `cooldown: true`, `retryAfterSeconds: 870`.

### Спам с одного IP

→ `429` + `Retry-After`.

---

## Чеклист для клиента

- [x] Вызывать только после реальной ошибки загрузки постера
- [x] Дедуп: не более одного in-flight запроса на `animeId`
- [x] Учитывать `cooldown` / `retryAfterSeconds`
- [x] Учитывать `429` / `Retry-After` (глобальный pause очереди)
- [x] Не обходить каталог refresh-запросами
- [x] После успеха обновить локальный кэш постеров / перезапросить anime details
- [x] Для отображения URL учитывать [X-Image-CDN](client-image-cdn.md)
