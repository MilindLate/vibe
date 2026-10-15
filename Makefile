#!/usr/bin/env make
.PHONY: help install dev build test docker-up docker-down migrate seed

COMPOSE := docker compose -f infrastructure/docker/docker-compose.yml
DB_URL := postgresql://postgres:postgres@localhost:5432/tiktok_db

help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	npm install

dev: ## Start development servers (backend + frontend)
	npm run dev

build: ## Build everything for production
	npm run build

docker-up: ## Start all Docker services
	$(COMPOSE) up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@$(MAKE) migrate
	@echo ""
	@echo "✅ Platform is running!"
	@echo "   Frontend:    http://localhost:5173"
	@echo "   Backend API: http://localhost:3000"
	@echo "   API Docs:    http://localhost:3000/api-docs"
	@echo "   MinIO UI:    http://localhost:9001  (minioadmin / minioadmin)"

docker-down: ## Stop all Docker services
	$(COMPOSE) down

docker-logs: ## Follow logs from all services
	$(COMPOSE) logs -f

migrate: ## Run database migrations
	cd backend && npx prisma migrate deploy

migrate-dev: ## Run migrations in dev mode
	cd backend && npx prisma migrate dev

seed: ## Seed the database with sample data
	cd backend && npx ts-node prisma/seed.ts

prisma-studio: ## Open Prisma Studio (DB GUI)
	cd backend && npx prisma studio

lint: ## Run linters
	cd backend && npm run lint
	cd frontend && npm run lint

clean: ## Remove build artifacts and node_modules
	rm -rf backend/dist frontend/dist
	rm -rf backend/node_modules frontend/node_modules node_modules

env: ## Copy .env.example to .env (first-time setup)
	cp backend/.env.example backend/.env
	@echo "✅ backend/.env created — please edit with your settings"
