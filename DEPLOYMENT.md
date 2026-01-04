# Deployment Instructions

This project is set up with a GitHub Actions workflow that automatically tests, builds, and publishes a Docker image of your application.

## 1. Automated CI/CD Workflow
The workflow in `.github/workflows/deploy.yml` performs the following:
- **On Pull Requests:** Runs type checking (`npm run check`), tests (`npx vitest run`), and verifies the build.
- **On Push to Main:** Runs the above checks, then builds a Docker image and pushes it to the **GitHub Container Registry (GHCR)**.

## 2. Deployment Platform Recommendation
**Recommended Platform: Railway (railway.app)**

Railway is optimal for this project because:
- It natively supports the **Node.js + PostgreSQL** stack.
- It provides zero-config PostgreSQL databases.
- It can deploy directly from your GitHub repository OR from the Docker image built by our workflow.

## 3. Step-by-Step Deployment on Railway

### Option A: Deploy using the CI-Built Docker Image (Robust & Recommended)
This method ensures that exactly what was tested and built in GitHub Actions is what runs in production.

1. **Prerequisite:** Ensure the GitHub Action "publish" job has run successfully at least once on the `main` branch.
2. Go to [Railway.app](https://railway.app/) and sign up.
3. **Create Project:** Click "New Project" -> "Empty Project".
4. **Add Database:** Click "New" -> "Database" -> "PostgreSQL".
5. **Add Service:** Click "New" -> "Image".
6. **Configure Image Source:**
   - Enter the image URL: `ghcr.io/YOUR_GITHUB_USERNAME/rest-express:latest` (replace with your details).
   - Railway might ask for Docker credentials if the package is private. You can generate a Personal Access Token (PAT) in GitHub settings with `read:packages` scope and provide it to Railway.
7. **Configure Variables:**
   - Click on the new Service -> "Variables".
   - Add `SESSION_SECRET` (generate a random string).
   - Add `DATABASE_URL`. You can reference the Postgres service variable using `${{Postgres.DATABASE_URL}}`.
   - Add `NODE_ENV` = `production`.
   - Add `PORT` = `5000`.
8. **Deploy:** Railway will deploy the image.
9. **Continuous Deployment:** You can use a Railway webhook to trigger a redeploy whenever a new image is pushed to GHCR, or simply rely on Railway's polling if configured.

### Option B: Deploy from GitHub Source (Simple)
This method lets Railway build the app from source.

1. Go to Railway -> "New Project" -> "Deploy from GitHub repo".
2. Select this repository.
3. Railway will detect the `Dockerfile` and build it.
4. Follow the "Configure Variables" steps from Option A.

## 4. Other Platforms
- **Render:** Create a "Web Service", select "Existing Image" (for Option A) or "Connect GitHub" (for Option B). Ensure you provision a PostgreSQL database.
- **DigitalOcean App Platform:** Select repository, it will detect the Dockerfile.

## 5. Environment Variables Checklist
- `DATABASE_URL`: Connection string for PostgreSQL.
- `SESSION_SECRET`: A long random string for session security.
- `NODE_ENV`: Set to `production`.
- `PORT`: Set to `5000` (matches Dockerfile EXPOSE).
