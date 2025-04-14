# Use Node.js LTS version as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY client/package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the client code
COPY client/ ./

# Set environment variables
ENV NODE_ENV=development
ENV REACT_APP_API_URL=http://localhost:4000

# Expose port 3000 for the client
EXPOSE 3000

# Start the client in development mode
CMD ["npm", "start"]