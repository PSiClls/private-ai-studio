FROM python:3.11-slim AS backend

WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM node:20-alpine AS frontend

WORKDIR /app/frontend
COPY frontend/package*.json .
RUN npm ci --omit=dev
COPY frontend/ .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
