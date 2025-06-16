.PHONY: install dev run

install:
	python3 -m venv .venv
	. .venv/bin/activate && pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run:
	docker build -t recai-back .
	docker run --rm -it \
	  -v $$PWD:/app \
	  -v $$PWD/data:/app/data \
	  -v $$PWD/logs:/app/logs \
	  -p 8000:8000 \
	  recai-back
