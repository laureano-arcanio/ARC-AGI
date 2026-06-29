run-local:
	@echo "Running local environment..."
	export DATABASE_URL="postgresql+asyncpg://dev-user:password@localhost:5432/dev_db"
	cd backend && \
	poetry run sh -c "uvicorn app.main:app --host localhost --port 8000 --reload"

run:
	docker compose --profile local up --force-recreate

run-rebuild:
	docker compose --profile local up --build

db-console:
	docker compose exec postgres psql -U dev-user -d postgres

db-migrate:
	docker compose exec backend poetry run alembic upgrade head

generate-migration:
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "Error: Migration name is required. Use 'make generate-migration \"<migration name>\"'"; \
		exit 1; \
	fi
	docker compose exec backend poetry run alembic revision --autogenerate -m "$(filter-out $@,$(MAKECMDGOALS))"



make run-db:
	@echo "Running database..."
	docker compose up postgres
