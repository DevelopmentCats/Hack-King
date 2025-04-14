# Hack King

A browser-based, multiplayer hacking simulation game that is both educational and entertaining, teaching cybersecurity concepts through engaging gameplay.

## Project Overview

Hack King is a full-stack web application that simulates hacking scenarios in a multiplayer environment. Players can learn cybersecurity concepts while competing against each other in various hacking challenges.

### Tech Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Real-time Communication**: Socket.io
- **Authentication**: JWT
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Deployment**: Nixpacks

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development outside Docker)
- Git

### Getting Started with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/hack-king.git
   cd hack-king
   ```

2. Start the development environment:
   ```bash
   docker-compose up
   ```

   This will start three services:
   - Frontend: React application (available at http://localhost:3000)
   - Backend: Node.js API (available at http://localhost:5000)
   - Database: PostgreSQL instance

3. Development with hot-reloading:
   - The application is configured for hot-reloading, so changes to the code will automatically update in the browser.
   - Frontend code is in the `client` directory
   - Backend code is in the `server` directory

### Running Without Docker

#### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file based on `.env.example`
   - Configure your PostgreSQL connection

4. Start the development server:
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Project Structure

```
hack-king/
├── client/                      # Frontend React application
│   ├── public/                  # Static assets
│   └── src/                     # Source code
├── server/                      # Backend Node.js application
│   ├── src/                     # Source code
│   └── prisma/                  # Prisma ORM
├── .github/                     # GitHub configuration
│   └── workflows/               # GitHub Actions workflows
├── docker/                      # Docker configuration files
├── docker-compose.yml           # Docker Compose configuration
├── nixpacks.toml                # Nixpacks configuration
└── README.md                    # Project overview and setup instructions
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Submit a pull request to `develop`

## License

[MIT License](LICENSE)