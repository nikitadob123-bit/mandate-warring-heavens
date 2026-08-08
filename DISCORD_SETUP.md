# Настройка Boosty → Discord → MANDATE

## Что делает v1.4

Платёж обрабатывает Boosty. Boosty должен выдавать активным подписчикам выбранную роль на вашем Discord-сервере.
MANDATE не получает пароль Boosty и не обращается к приватным endpoint'ам Boosty.

Игрок:
1. покупает подписку Boosty;
2. получает роль подписчика на Discord;
3. регистрируется/входит в MANDATE;
4. нажимает «Связать Discord»;
5. разрешает OAuth2 `identify`;
6. сервер MANDATE получает Discord user ID;
7. серверный Discord-бот проверяет участника вашего сервера;
8. если в `member.roles` есть `DISCORD_BOOSTY_ROLE_ID`, доступ активируется.

При последующих проверках MANDATE снова смотрит роль. Если роль снята, премиум-доступ отзывается.

## 1. Discord-сервер

Создайте (или выберите) Discord-сервер проекта.
Подключите к нему официальную интеграцию Boosty и настройте выдачу отдельной роли, например:

`MANDATE Subscriber`

для уровня подписки игры за $3.

Скопируйте:
- ID сервера → `DISCORD_GUILD_ID`
- ID этой роли → `DISCORD_BOOSTY_ROLE_ID`

В Discord нужно включить Developer Mode, чтобы копировать ID.

## 2. Discord Application

На Discord Developer Portal создайте приложение MANDATE.

OAuth2 Redirect URI:
- локально: `http://localhost:3000/api/discord/callback`
- на сайте: `https://ВАШ-ДОМЕН/api/discord/callback`

Точно такой же URL укажите в `.env` как `DISCORD_REDIRECT_URI`.

Скопируйте:
- Application / Client ID → `DISCORD_CLIENT_ID`
- Client Secret → `DISCORD_CLIENT_SECRET`

## 3. Discord Bot

В том же приложении создайте Bot и добавьте его на ваш Discord-сервер.

Скопируйте Bot Token → `DISCORD_BOT_TOKEN`.

Бот нужен серверу MANDATE, чтобы получать одного участника сервера по его Discord user ID и читать список role ID.
Токен бота никогда не добавляйте в HTML/JavaScript клиента и не публикуйте.

## 4. .env

Пример:

```env
JWT_SECRET=очень-длинный-секрет
ADMIN_KEY=ещё-один-длинный-секрет
BOOSTY_URL=https://boosty.to/7thdimension/purchase/2906702?ssource=DIRECT&share=subscription_link
BOOSTY_PRICE_USD=3

DISCORD_CLIENT_ID=1234567890
DISCORD_CLIENT_SECRET=секрет
DISCORD_REDIRECT_URI=https://game.example.com/api/discord/callback
DISCORD_BOT_TOKEN=токен_бота
DISCORD_GUILD_ID=1234567890
DISCORD_BOOSTY_ROLE_ID=1234567890
```

## 5. Проверка

Запустите:

```bash
npm install
npm start
```

Зарегистрируйте тестовый игровой аккаунт и войдите.
Нажмите «Связать Discord».

- Если у Discord-аккаунта есть нужная роль → `/api/access` вернёт `active: true`.
- Если роли нет → `active: false`.
- Если роль затем снять → следующая проверка автоматически отзовёт доступ.

## Безопасность

- Client Secret и Bot Token должны существовать только на сервере.
- OAuth state подписан JWT и действует 10 минут.
- Discord access token используется только во время callback и не сохраняется в базе.
- В базе хранится только Discord user ID/username и результат последней проверки роли.
- Реальный доступ определяется сервером, а не значением в браузерном localStorage.
