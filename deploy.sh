#!/bin/bash

# Скрипт для деплоя в Cloud Run с правильными переменными окружения

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Деплой Command Task Planner в Cloud Run ===${NC}\n"

# Проверка переменных окружения Firebase
if [ -z "$VITE_FIREBASE_API_KEY" ] || [ -z "$VITE_FIREBASE_AUTH_DOMAIN" ] || [ -z "$VITE_FIREBASE_PROJECT_ID" ]; then
    echo -e "${RED}ОШИБКА: Переменные окружения Firebase не заданы!${NC}"
    echo -e "${YELLOW}Установите следующие переменные:${NC}"
    echo "  export VITE_FIREBASE_API_KEY=your_api_key"
    echo "  export VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain"
    echo "  export VITE_FIREBASE_PROJECT_ID=your_project_id"
    echo "  export VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket"
    echo "  export VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id"
    echo "  export VITE_FIREBASE_APP_ID=your_app_id"
    exit 1
fi

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-rugged-nucleus-476116-n8}
IMAGE_NAME="gcr.io/${PROJECT_ID}/command-task-planner"
REGION="us-west1"
SERVICE_NAME="command-task-planner"

echo -e "${GREEN}1. Сборка Docker образа...${NC}"
gcloud builds submit \
  --tag "${IMAGE_NAME}" \
  --build-arg VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY}" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN}" \
  --build-arg VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID}" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET}" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID}" \
  --build-arg VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID}"

if [ $? -ne 0 ]; then
    echo -e "${RED}ОШИБКА: Сборка Docker образа не удалась!${NC}"
    exit 1
fi

echo -e "\n${GREEN}2. Деплой в Cloud Run...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=${GOOGLE_API_KEY:-},TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}"

if [ $? -ne 0 ]; then
    echo -e "${RED}ОШИБКА: Деплой не удался!${NC}"
    exit 1
fi

echo -e "\n${GREEN}✓ Деплой завершен успешно!${NC}"
echo -e "${YELLOW}URL сервиса:${NC}"
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)'

