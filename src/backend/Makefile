# ── Config ────────────────────────────────────────────────────────────────────
IMAGE       ?= ghcr.io/ryanlinyuche/mcps-backend
TAG         ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo latest)
RELEASE     ?= mcps-backend
NAMESPACE   ?= default
HELM_DIR    := helm/mcps-backend
VALUES      ?= $(HELM_DIR)/values.yaml

.PHONY: help install build dev up down push lint test template deploy upgrade uninstall clean logs

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ── Local dev ─────────────────────────────────────────────────────────────────
install: ## Install npm dependencies
	npm ci

dev: ## Run backend in dev mode (live reload)
	npm run dev

lint: ## Lint TypeScript source
	npm run lint

test: ## Run tests
	ENCRYPTION_KEY=$${ENCRYPTION_KEY:-test-key} npm test

# ── Docker ────────────────────────────────────────────────────────────────────
build: ## Build Docker image
	docker build -t $(IMAGE):$(TAG) -t $(IMAGE):latest .

push: build ## Build and push Docker image
	docker push $(IMAGE):$(TAG)
	docker push $(IMAGE):latest

# ── Docker Compose ────────────────────────────────────────────────────────────
up: ## Start services with docker compose
	docker compose up -d --build

down: ## Stop services
	docker compose down

logs: ## Tail docker compose logs
	docker compose logs -f

# ── Helm ──────────────────────────────────────────────────────────────────────
helm-lint: ## Lint Helm chart
	helm lint $(HELM_DIR) -f $(VALUES)

template: ## Render Helm templates (dry-run)
	helm template $(RELEASE) $(HELM_DIR) -f $(VALUES)

deploy: ## Install or upgrade Helm release (reads .env for secrets)
	@test -f .env || { echo "ERROR: .env not found — copy .env.example and fill it in"; exit 1; }
	set -a && . ./.env && set +a && \
	helm upgrade --install $(RELEASE) $(HELM_DIR) \
		-f $(VALUES) \
		-n $(NAMESPACE) --create-namespace \
		--set image.tag=$(TAG) \
		--set secrets.ENCRYPTION_KEY="$$ENCRYPTION_KEY" \
		--set secrets.API_KEY="$$API_KEY" \
		--set secrets.BAN_LIST="$$BAN_LIST" \
		--set cloudflared.tunnelToken="$$CLOUDFLARE_TUNNEL_TOKEN"

uninstall: ## Uninstall Helm release
	helm uninstall $(RELEASE) -n $(NAMESPACE)

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean: ## Remove build artifacts
	rm -rf dist node_modules
