FROM node:20-alpine

WORKDIR /app

# 1. Копируем только файлы зависимостей
COPY package*.json ./

# 2. Ставим зависимости
RUN npm ci

# 3. Копируем остальной код
COPY . .

# 4. Переменные окружения для сборки (Build-time)
# Эти переменные нужны Vite для замены import.meta.env.VITE_* во время сборки
# Если они не заданы, Firebase не инициализируется
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# 5. Собираем фронтенд Vite (с переменными окружения)
RUN echo "Building frontend..." && \
    npm run build && \
    echo "Build completed. Checking dist directory..." && \
    ls -la dist/ && \
    test -f dist/index.html || (echo "ERROR: dist/index.html not found!" && exit 1) && \
    echo "✓ dist/index.html found successfully"

# 6. Настройки окружения по умолчанию
ENV NODE_ENV=production
ENV PORT=8080

# 7. Проверяем что server.js существует
RUN test -f server.js || (echo "ERROR: server.js not found!" && exit 1) && \
    echo "✓ server.js found"

# 8. Запуск Node-сервера
CMD ["node", "server.js"]

