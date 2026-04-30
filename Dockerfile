FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download embedding model at build time so cold starts don't pay for it
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

ENV PORT=8000
CMD uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
