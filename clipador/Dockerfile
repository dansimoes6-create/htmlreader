FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-inter fontconfig ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY web ./web
COPY run.py .

ENV CLIPADOR_DATA=/data \
    PORT=8000
VOLUME ["/data"]
EXPOSE 8000
CMD ["python", "run.py"]
