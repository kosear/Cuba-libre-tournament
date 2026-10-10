# Инфраструктура

Как устроены сервер и выкладка. Для разработки обычно хватает `CLAUDE.md` в корне, этот файл нужен для отладки и изменений инфраструктуры.
За инфраструктуру отвечает владелец GitHub-аккаунта `tarefev`.

## Сервер

- VPS у FirstVDS: Ubuntu 24.04, 1 CPU, 1.8 ГБ памяти, IP `199.189.250.169`.
- Вход по SSH-ключу root, ключ есть только у владельца инфраструктуры.
- Установлены Node 22, git, Caddy 2.6 из пакетов Ubuntu, sqlite3, Claude Code.
- Открыты порты 22, 80, 443 (ufw).

## Домен и DNS

- `cubalibre.su`, регистратор REGTIME, DNS-серверы FirstVDS `ns1.firstvds.ru` и `ns2.firstvds.ru`.
- Записи правятся в DNSmanager FirstVDS: личный кабинет → Товары → Виртуальные серверы → Инструкция → DNSmanager.
- A-записи `cubalibre.su` и `*.cubalibre.su` указывают на сервер. Wildcard покрывает `www`, `dev` и любые новые поддомены.
- **Статус на 2026-10-10:** реестр `.su` ещё не опубликовал делегирование, публичные DNS отвечают NXDOMAIN.
  На сервере работает временный таймер `cubalibre-wait-dns.timer`. Раз в 5 минут он проверяет DNS, а когда домен появится,
  перезапускает Caddy для выпуска сертификатов и удаляет себя. В whois домен `UNVERIFIED`, у регистратора может потребоваться подтверждение данных.

## HTTPS и прокси

Caddy сам выпускает и продлевает сертификаты Let's Encrypt. Конфиг `/etc/caddy/Caddyfile`, исходник в `deploy/Caddyfile`.
- `cubalibre.su`, `www.cubalibre.su` → `127.0.0.1:3000` (prod)
- `dev.cubalibre.su` → `127.0.0.1:3001` (dev)
- `flush_interval -1` отключает буферизацию, без этого не работает SSE.

## Окружения

| | prod | dev |
|---|---|---|
| Ветка | `main` | `dev` |
| Папка | `/srv/cubalibre/prod` | `/srv/cubalibre/dev` |
| Порт | 3000 | 3001 |
| Приложение | `cubalibre@prod` | `cubalibre@dev` |
| Автодеплой | `cubalibre-sync@prod.timer` | `cubalibre-sync@dev.timer` |

- Приложение работает от системного пользователя `cubalibre`, не от root.
- В каждой папке свой `.env` и своя база `data/app.db`, оба вне git.
- Запуск через `node --watch`: правка файла перезапускает процесс.

## Как работает автодеплой

`deploy/sync.sh` запускается таймером каждые 15 секунд:
1. `git fetch` нужной ветки. Ключи не нужны, репозиторий публичный.
2. Если коммит новый, `git reset --hard` на него. Локальные правки на сервере теряются, источник правды — GitHub.
3. Если поменялись `package.json` или `package-lock.json`, выполняется `npm ci --omit=dev`.
4. Перезапуск `cubalibre@<env>`. Миграции применяются при старте.

Изменения в `deploy/` автоматически **не применяются**. После их мерджа в `main` выполнить на сервере от root:
```
bash /srv/cubalibre/prod/deploy/setup.sh
```
Скрипт идемпотентный. Он создаёт пользователя и клоны, если их нет, ставит unit-файлы и Caddyfile и перезапускает сервисы. Существующие `.env` и базы не трогает.

## Частые команды

На сервере, `ssh root@199.189.250.169`:
```
journalctl -u cubalibre@dev -f                        # логи приложения dev
journalctl -u cubalibre-sync@prod -n 50               # история выкладок prod
systemctl restart cubalibre@prod                      # перезапуск, например после правки .env
bash /srv/cubalibre/dev/deploy/copy-prod-to-dev.sh    # скопировать базу prod в dev
sqlite3 /srv/cubalibre/prod/data/app.db               # консоль базы
```

Управление админами описано в разделе «Админы» в `CLAUDE.md`.

## Чего пока нет

- **Бэкапов базы prod.** Простой вариант: ежедневный таймер с `sqlite3 app.db ".backup ..."` и хранением последних N копий.
- Мониторинга. Минимум: внешняя проверка `https://cubalibre.su/api/health`.
- Старая установка до переезда в репозиторий лежит в `/root/cubalibre-old-backup`, её можно удалить.
