#!/bin/bash

# Скрипт для развертывания правил Firestore

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Развертывание правил Firestore ===${NC}\n"

# Проверка наличия Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}Firebase CLI не установлен. Устанавливаю...${NC}"
    npm install -g firebase-tools
    if [ $? -ne 0 ]; then
        echo -e "${RED}ОШИБКА: Не удалось установить Firebase CLI${NC}"
        exit 1
    fi
fi

# Проверка авторизации
echo -e "${GREEN}Проверка авторизации в Firebase...${NC}"
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Требуется авторизация. Выполняю вход...${NC}"
    firebase login
    if [ $? -ne 0 ]; then
        echo -e "${RED}ОШИБКА: Не удалось авторизоваться${NC}"
        exit 1
    fi
fi

# Получение проекта из переменной окружения или запрос
PROJECT_ID=${FIREBASE_PROJECT_ID:-}

if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Переменная FIREBASE_PROJECT_ID не установлена${NC}"
    echo -e "${YELLOW}Доступные проекты:${NC}"
    firebase projects:list
    echo ""
    read -p "Введите Project ID: " PROJECT_ID
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}ОШИБКА: Project ID не указан${NC}"
    exit 1
fi

echo -e "${GREEN}Используется проект: ${PROJECT_ID}${NC}\n"

# Проверка наличия файла правил
if [ ! -f "firestore.rules" ]; then
    echo -e "${RED}ОШИБКА: Файл firestore.rules не найден${NC}"
    exit 1
fi

# Валидация правил
echo -e "${GREEN}Валидация правил...${NC}"
firebase deploy --only firestore:rules --project "$PROJECT_ID" --dry-run
if [ $? -ne 0 ]; then
    echo -e "${RED}ОШИБКА: Правила содержат ошибки${NC}"
    exit 1
fi

# Развертывание
echo -e "\n${GREEN}Развертывание правил...${NC}"
firebase deploy --only firestore:rules --project "$PROJECT_ID"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Правила Firestore успешно развернуты!${NC}"
else
    echo -e "\n${RED}ОШИБКА: Не удалось развернуть правила${NC}"
    exit 1
fi

