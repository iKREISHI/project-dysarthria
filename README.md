# Project dysarthria
Информационная система для коррекции дизартрии
## Dev setup:
```bash
# git clone repo
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# run dev db into docker
# docker compose -f docker-compose.yml up -d
# docker compose up -d postgres
make postgres-start 
# docker postgres logs
# docker compose -f docker-compose.yml logs
docker compose logs postgres   
# docker postgres stop
# docker compose -f docker-compose.yml stop
docker compose stop postgres 
# 
# create .env file
# ...
# run migrations
python manage.py makemigrations users
python manage.py makemigrations testing
python manage.py migrate
# run project
python manage.py runserver 8000 
```
## Frontend dev

frontend env
```bash
cat > .env << EOF
HOST=127.0.0.1
PORT=3000
# REACT_APP_BASE_URL=http://127.0.0.1:8000
REACT_APP_BASE_URL=https://dysarthria.shspu.ru
EOF
```

How to run frontend app.
```bash
cd frontend/
yarn install # install project dependencies
yarn start # start frontend app
```
# Testing
## Backend
### Test all backend
```bash
make test-backend-all  
```
### Test backend users app
```bash
make test-backend-users
```
### Test backend user-api app
```bash
make test-backend-user-api
```
### Test backend api-v0 app
```bash
make test-backend-api-v0
```
# Environment:
#### Ps. Стоит заметить, что имя базы данных, пользователя, пароль пользователя, хост и порт для подключения к базе данных доложны соблюдать с таковыми в из файла конфигурации `docker-compose.yml`
file location: ./backend/.env
```bash
# .env
DEBUG=1 # debug mode
SECRET_KEY=secret
DJANGO_ALLOWED_HOSTS=localhost 127.0.0.1 [::1]
CORS_ALLOWED_ORIGINS=localhost 127.0.0.1
DB_ENGINE=django.db.backends.postgresql
POSTGRES_DB=project-db
POSTGRES_USER=user-db
POSTGRES_PASSWORD=password-project-db
DB_HOST=localhost
DB_PORT=5432
SITE_URL=http://127.0.0.1:3000
EMAIL_HOST_USER=projectdysarthria@gmail.com
EMAIL_HOST_PASSWORD=password
EMAIL_CONFIRMATION_TOKEN_LIFETIME=15
ADMIN_EMAIL=vadas25@yandex.ru
ADMIN_PASSWORD=password
PASSWORD_RESET_TOKEN_LIFETIME=15
```
### .env.docker
file location: ./.env.docker
```bash
# .env.docker
DEBUG=1 # debug mode
SECRET_KEY=secret
DJANGO_ALLOWED_HOSTS=localhost 127.0.0.1 [::1]
CORS_ALLOWED_ORIGINS=localhost 127.0.0.1
DB_ENGINE=django.db.backends.postgresql
POSTGRES_DB=project-db
POSTGRES_USER=user-db
POSTGRES_PASSWORD=password-project-db
DB_HOST=postgres
DB_PORT=5432
SITE_URL=http://127.0.0.1:3000
EMAIL_HOST_USER=projectdysarthria@gmail.com
EMAIL_HOST_PASSWORD=password
EMAIL_CONFIRMATION_TOKEN_LIFETIME=15
ADMIN_EMAIL=vadas25@yandex.ru
ADMIN_PASSWORD=password
PASSWORD_RESET_TOKEN_LIFETIME=15
```
## .env file for frontend
file location: frontend/
```bash
# .env
HOST=127.0.0.1
PORT=3000
```
