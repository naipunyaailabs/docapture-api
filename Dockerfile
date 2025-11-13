# Use the official Bun runtime image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lock
COPY package.json bun.lock* ./

# Install dependencies using Bun
RUN bun install

# Copy the rest of the application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose the port the app runs on
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "fetch('http://localhost:5000/').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Command to run the application in production mode
CMD ["bun", "run", "start"]