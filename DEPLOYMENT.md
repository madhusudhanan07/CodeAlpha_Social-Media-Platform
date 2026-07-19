# Deployment Guide

This guide walks you through deploying the CodeAlpha Social Media Platform to a production environment.

## 1. Database Deployment (Railway / PlanetScale)

We recommend using managed MySQL database providers like **Railway** or **PlanetScale** for production.

1. Create an account on [Railway.app](https://railway.app/).
2. Click **New Project** -> **Provision MySQL**.
3. Once provisioned, click on the MySQL service and go to the **Connect** tab.
4. Copy the `MYSQL_URL` (Connection String) or the individual variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
5. Connect to this database using a GUI tool (like DBeaver or MySQL Workbench) and execute the table schema generated during local development, or manually run the `alterDB.js` script with the production credentials in your `.env`.

## 2. Backend Deployment (Render / Railway)

We recommend deploying the Express backend on **Render.com** or **Railway**.

### Steps for Render
1. Create a new **Web Service** on Render.
2. Link your GitHub repository.
3. Set the **Root Directory** to `backend`.
4. Set the **Build Command** to: `npm install`
5. Set the **Start Command** to: `node server.js`
6. Add the following **Environment Variables**:
   - `PORT` (Usually provided by Render, often 10000)
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (Important: Wrap the private key in quotes if it fails to parse newlines)

*Note on Uploads: Since this project uses local disk storage (`/uploads`), deploying on ephemeral servers like Render will result in uploads disappearing on restart. For a true production app, modify `uploadRoutes.js` to upload buffers directly to AWS S3 or Cloudinary.*

## 3. Frontend Deployment (Vercel / Netlify)

Vercel provides the fastest edge-network hosting for Vite apps.

### Steps for Vercel
1. Create an account on **Vercel**.
2. Click **Add New Project** and connect your GitHub repository.
3. Set the **Root Directory** to `frontend`.
4. The Build Command should automatically detect as `npm run build`.
5. Add the **Environment Variables**:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_API_URL` (Set this to your newly deployed Backend URL, e.g., `https://codealpha-backend.onrender.com/api`)
6. Click **Deploy**.

## 4. Production Checklist
Before launching, ensure:
- [ ] CORS is strictly configured in the backend to only allow your Vercel URL.
- [ ] You have swapped out `http://localhost:5000` with real API base URLs globally in the frontend axios services.
- [ ] The Firebase `firebaseServiceAccountKey.json` is omitted from version control and securely loaded from ENV strings.
- [ ] The Database Connection Pool uses a robust limit configuration (`connectionLimit: 10`).
