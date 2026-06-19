#!/bin/bash

# Entrypoint script for the API service
if [ "$ENVIRONMENT" == "local" ]; then
    poetry run alembic upgrade head
    poetry run python -m debugpy  --listen 0.0.0.0:5678 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
elif [ "$ENVIRONMENT" == "dev" ]; then
    poetry run alembic upgrade head
    
    # Check if arguments were passed
    if [ $# -eq 0 ]; then
        # No arguments, run all tests
        poetry run pytest
    else
        # Arguments provided, run specific tests
        poetry run pytest "$@"
    fi
else
    poetry run alembic upgrade head
    poetry run sh -c "LOG_JSON_FORMAT=true uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-config uvicorn_disable_logging.json --forwarded-allow-ips=*"
fi
