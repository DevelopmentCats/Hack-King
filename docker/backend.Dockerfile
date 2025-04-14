FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment to development
ENV NODE_ENV=development

# Expose port
EXPOSE 5000

# Start the application in development mode with hot reloading
CMD ["npm", "run", "dev"]