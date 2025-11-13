# Docapture API

This is the backend API component of the Docapture application built with Node.js and TypeScript.

## Features

- Document field extraction processing
- Document summarization
- RFP (Request for Proposal) generation
- User authentication and management
- Processing history tracking
- Subscription management

## Getting Started

### Prerequisites

- Node.js
- Bun runtime
- MongoDB
- Docker (optional, for containerized deployment)

### Development

1. Install dependencies: `bun install`
2. Create a `.env` file with your configuration
3. Run the development server: `bun run dev`
4. Access the API at `http://localhost:5000`

### Docker Deployment

1. Build and run with Docker Compose: `docker-compose up -d`
2. Access the API at `http://localhost:5000`

## Environment Variables

Create a `.env` file with the following variables:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/docapture
API_KEY=your_api_key_here
GROQ_API_KEY=your_groq_api_key_here
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Docapture" <admin@docapture.com>
```

## Security Notice

**Important**: Never commit actual API keys or secrets to the repository.
All sensitive information should be stored in environment variables.