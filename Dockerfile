FROM node:20-alpine

WORKDIR /app

# 1. Копируем только файлы зависимостей
COPY package*.json ./

# 2. Ставим зависимости
# Используем --legacy-peer-deps для разрешения конфликтов между React 19 и @testing-library/react
# Retry npm install up to 4 times in case of network/registry issues
RUN for i in 1 2 3 4; do \
      echo "Attempt $i: Installing dependencies..." && \
      npm ci --legacy-peer-deps && break || \
      (echo "Attempt $i failed, waiting before retry..." && sleep $((i * 5))); \
    done && \
    npm ci --legacy-peer-deps

# 3. Копируем остальной код (исключая node_modules и dist, если они есть локально)
COPY . .

# 4. Собираем фронтенд Vite
# Примечание: Firebase конфигурация теперь загружается runtime с сервера
# из переменных окружения Cloud Run, поэтому build-time переменные не нужны
RUN npm run build

# 5. Проверяем что dist собран и содержит необходимые файлы
RUN echo "=== Verifying build ===" && \
    ls -la dist/ && \
    test -f dist/index.html || (echo "ERROR: dist/index.html not found!" && exit 1) && \
    test -d dist/assets || (echo "ERROR: dist/assets directory not found!" && exit 1) && \
    echo "✓ Build verification passed" && \
    echo "=== Listing assets files ===" && \
    ls -la dist/assets/ && \
    echo "=== Assets file count ===" && \
    ls -1 dist/assets/ | wc -l && \
    echo "=== Sample asset files ===" && \
    ls -1 dist/assets/ | head -10

# 6. Настройки окружения по умолчанию
ENV NODE_ENV=production
ENV PORT=8080

# 7. Запуск Node-сервера
CMD ["node", "server.js"]

