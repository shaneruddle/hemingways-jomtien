# Hemingways Jomtien

Website for Hemingways Jomtien — Jomtien's biggest expat sports bar & restaurant.

## Deployment

This project deploys automatically to **Google Cloud Run** via GitHub Actions whenever you push to `main`. No AI Studio required.

**Live site:** https://hemingways-jomtien-784768630399.asia-southeast1.run.app

## Making Changes

Edit any file directly in GitHub and commit to `main` — the site will automatically rebuild and redeploy in ~3-5 minutes. Watch progress in the **Actions** tab.

## Local Development

Prerequisites: Node.js 20+

1. Clone the repo
2. 2. Copy `.env.example` to `.env.local` and set your keys
   3. 3. `npm install`
      4. 4. `npm run dev`
        
         5. ## CI/CD Setup (one-time)
        
         6. Add these secrets in **Settings → Secrets and variables → Actions**:
        
         7. | Secret | Value |
         8. |--------|-------|
         9. | `GCP_SA_KEY` | JSON key for a GCP service account (Cloud Run Developer + Storage Object Admin + Service Account User roles) |
         10. | `GEMINI_API_KEY` | Your Gemini API key |
        
         11. To create the GCP service account: Console → IAM & Admin → Service Accounts → Create → add roles above → Keys → Add Key → JSON → paste in GitHub secret.
        
         12. ## Project Structure
        
         13. ```
             src/           React/TypeScript frontend (Vite)
             public/        Static assets (menu images, logo)
             server.ts      Express server (API proxy + serves built frontend)
             Dockerfile     Container build for Cloud Run
             .github/       GitHub Actions CI/CD workflow
             ```
