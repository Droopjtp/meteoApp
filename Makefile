COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help env up down build rebuild restart ps logs logs-api logs-web logs-db \
	shell-api shell-db psql dev clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

env: ## Create .env from .env.example if missing
	@test -f .env || (cp .env.example .env && echo ".env created from .env.example")

up: env ## Start all containers (detached)
	$(COMPOSE) up -d

down: ## Stop and remove containers (keeps DB data)
	$(COMPOSE) down

build: env ## Build images
	$(COMPOSE) build

rebuild: env ## Rebuild images and restart containers
	$(COMPOSE) up -d --build

restart: ## Restart containers (make restart s=api for one service)
	$(COMPOSE) restart $(s)

ps: ## List containers
	$(COMPOSE) ps

logs: ## Follow logs of all containers (make logs s=api for one service)
	$(COMPOSE) logs -f $(s)

logs-api: ## Follow API logs
	$(COMPOSE) logs -f api

logs-web: ## Follow web (nginx) logs
	$(COMPOSE) logs -f web

logs-db: ## Follow database logs
	$(COMPOSE) logs -f db

shell-api: ## Open a shell in the API container
	$(COMPOSE) exec api sh

shell-db: ## Open a shell in the database container
	$(COMPOSE) exec db sh

psql: ## Open psql on the database
	$(COMPOSE) exec db psql -U meteo -d meteo

dev: env ## Start only the DB in Docker, then API and web in watch mode
	$(COMPOSE) up -d db
	pnpm dev

clean: ## Stop containers and delete volumes (DB data) and local images
	$(COMPOSE) down -v --rmi local
