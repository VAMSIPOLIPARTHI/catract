FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV (if needed) and other tools
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create reports directory and set permissions
RUN mkdir -p reports && chmod 777 reports

# Expose the port (Hugging Face Spaces uses 7860)
EXPOSE 7860

# Run the application
CMD ["python", "app.py"]
