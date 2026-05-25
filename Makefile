.PHONY: help install dev backend frontend migrate seed

# Use quoted vars everywhere — the project path contains spaces
VENV := venv
PY   := $(VENV)/bin/python
PIP  := $(VENV)/bin/pip
UV   := $(VENV)/bin/uvicorn
ALB  := $(VENV)/bin/alembic

help:
	@echo ""
	@echo "  make install   — create venv and install all dependencies"
	@echo "  make dev       — start backend + frontend together (Ctrl+C to stop)"
	@echo "  make backend   — start only the FastAPI backend"
	@echo "  make frontend  — start only the Vite frontend"
	@echo "  make migrate   — run Alembic migrations (alembic upgrade head)"
	@echo "  make seed      — seed the first admin user (edit backend/create_admin.py first)"
	@echo ""

install:
	@echo "→ Creating Python virtualenv..."
	python3 -m venv "$(VENV)"
	"$(PIP)" install --upgrade pip --quiet
	"$(PIP)" install -r backend/requirements.txt
	@echo "→ Installing frontend dependencies..."
	cd frontend && npm install
	@echo ""
	@echo "Done. Copy your env file next:"
	@echo "  cp backend/.env.example .env   (then fill in your values)"
	@echo ""

dev:
	@bash dev.sh

backend:
	@echo "Starting backend on http://localhost:8000 ..."
	cd backend && "../$(UV)" app.main:app --reload --port 8000

frontend:
	@echo "Starting frontend on http://localhost:5173 ..."
	cd frontend && npm run dev

migrate:
	cd backend && "../$(ALB)" upgrade head

seed:
	cd backend && "../$(PY)" create_admin.py

seed-data:
	cd backend && "../$(PY)" seed.py
