# Use Node.js LTS version as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY server/package*.json ./

# Install dependencies
RUN npm ci

# Generate Prisma client
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy the rest of the server code
COPY server/ ./

# Set environment variables
ENV NODE_ENV=development
ENV PORT=4000

# Expose port 4000 for the server
EXPOSE 4000

# Start the server in development mode
CMD ["npm", "run", "dev"]