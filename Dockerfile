# Use a base image with Python
FROM python:3.12-alpine

# Install dependencies
RUN apk add --no-cache python3-dev git ca-certificates curl ffmpeg

# Set up a virtual environment for dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python packages
RUN pip install --no-cache-dir flask spotdl yt-dlp

# Create directories
WORKDIR /app
RUN mkdir -p /app/downloads

# Copy application code
COPY app /app
COPY web /app/web

# Expose the application port
EXPOSE 5000

# Run the application
CMD ["python3", "/app/main.py"]


