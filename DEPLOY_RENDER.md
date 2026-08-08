# Deploy on Render

1. Создай GitHub-репозиторий и загрузите содержимое этой папки в корень.
2. Render Dashboard → New → Blueprint → подключи репозиторий.
3. Render прочитает `render.yaml` и создаст Web Service + Postgres.
4. При создании введи секреты:
   - DISCORD_CLIENT_SECRET
   - DISCORD_BOT_TOKEN
5. После deploy получишь URL вида `https://mandate-warring-heavens.onrender.com`.
6. В Discord Developer Portal → OAuth2 → Redirects добавь ТОЧНО:
   `https://ТВОЙ-АДРЕС.onrender.com/api/discord/callback`
7. Проверь `https://ТВОЙ-АДРЕС.onrender.com/health` → `{"ok":true}`.
8. На сайте зарегистрируй аккаунт → «Связать Discord» → роль `Полководец` откроет доступ.

Важно: Free Render Postgres по текущим правилам Render истекает через 30 дней. Для постоянного коммерческого сервиса базу затем нужно обновить до платной либо перенести на другой постоянный PostgreSQL.
