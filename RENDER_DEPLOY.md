# Деплой на Render

Этот проект использует PHP (`api.php`), поэтому на Render его нужно запускать как **Web Service** с Docker, а не как Static Site.

## 1. Загрузить проект в GitHub

1. Создайте новый репозиторий на GitHub.
2. Загрузите туда все файлы из папки проекта.
3. Убедитесь, что в репозитории есть `Dockerfile`, `render-start.sh` и `render.yaml`.

## 2. Создать сервис на Render

1. Откройте Render Dashboard.
2. Нажмите **New > Web Service**.
3. Подключите GitHub и выберите репозиторий проекта.
4. Runtime должен быть **Docker**.
5. В Environment Variables добавьте:
   - `TEACHER_PASSWORD` = ваш новый пароль учителя
6. Нажмите **Create Web Service**.

После деплоя сайт будет доступен по адресу вида:

```text
https://certificate-registry-site.onrender.com
```

QR-коды будут вести на этот онлайн-адрес и открывать страницу проверки конкретного сертификата.

## Важно про сохранение сертификатов

Сертификаты сохраняются в `data/certificates.json`.

На бесплатном Render файловая система временная: после рестарта или redeploy новые сертификаты могут пропасть. Для реального использования нужен платный Web Service с Persistent Disk.

Для Persistent Disk укажите mount path:

```text
/var/www/html/data
```

Тогда `certificates.json` будет сохраняться между перезапусками.
