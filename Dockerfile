FROM node:20-alpine

WORKDIR /app

# 1. Копируем только файлы зависимостей
COPY package*.json ./

# 2. Ставим зависимости
RUN npm ci

# 3. Копируем остальной код
COPY . .

# 4. Собираем фронтенд Vite
# Примечание: Firebase конфигурация теперь загружается runtime с сервера
# из переменных окружения Cloud Run, поэтому build-time переменные не нужны
RUN npm run build

# Проверяем что dist собран
RUN ls -la dist/ && test -f dist/index.html || (echo "ERROR: dist/index.html not found!" && exit 1)

# 6. Настройки окружения по умолчанию
ENV NODE_ENV=production
ENV PORT=8080

# 7. Запуск Node-сервера
CMD ["node", "server.js"]

