# Deployment Guide for Hack King

This document provides instructions for deploying the Hack King application using Coolify.

## Prerequisites

- A Coolify instance running on a server
- Access to a PostgreSQL database
- GitHub repository with the Hack King codebase

## Deployment Steps

### 1. Setting Up Coolify

1. Log in to your Coolify dashboard
2. Create a new project for Hack King
3. Connect your GitHub repository to Coolify

### 2. Environment Configuration

Create the following environment variables in Coolify:

```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@your-db-host:5432/hackking
JWT_SECRET=your_jwt_secret
```

Replace the placeholders with your actual database credentials and a secure JWT secret.

### 3. Build Configuration

Coolify will use the Nixpacks configuration in the repository to build the application. The `nixpacks.toml` file in the root of the repository contains all necessary build instructions.

### 4. Database Setup

1. Create a PostgreSQL database for the application
2. Run database migrations:
   ```
   npx prisma migrate deploy
   ```

### 5. Deployment

1. In the Coolify dashboard, click "Deploy" for your Hack King project
2. Monitor the build and deployment process
3. Once complete, your application will be available at the URL provided by Coolify

### 6. Verification

1. Access the application URL
2. Verify that the frontend loads correctly
3. Test user registration and login functionality
4. Ensure that the game features are working as expected

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify that the DATABASE_URL environment variable is correct
   - Check that the database is accessible from the Coolify instance

2. **Build Failures**
   - Check the build logs for specific errors
   - Ensure that all dependencies are correctly specified in package.json files

3. **Runtime Errors**
   - Check the application logs in the Coolify dashboard
   - Verify that all environment variables are correctly set

## Continuous Deployment

The repository is configured with GitHub Actions for continuous integration. When changes are pushed to the main branch, the CI/CD pipeline will:

1. Run tests
2. Build the application
3. Deploy to Coolify (if configured)

For manual deployments, you can trigger a new build from the Coolify dashboard.