# IntoreAI resume parser (Qwen GGUF via llama-cpp + FastAPI).
# NOTE: llama-cpp-python builds from source on alpine — debian-slim is used
# for reliable wheels. The GGUF model itself is NOT baked in: mount it at
# /app/models (see docker-compose.yml) or set MODEL_PATH.
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

COPY parser-llm/requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY parser-llm/main.py ./main.py
COPY parser-llm/utils ./utils
WORKDIR /app/parser-llm

EXPOSE 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
