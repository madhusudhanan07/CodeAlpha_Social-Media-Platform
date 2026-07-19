# CodeAlpha Social Media Platform

![Social Media Banner](https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2000&auto=format&fit=crop)

A production-ready, enterprise-grade full-stack social media application built with React, Node.js, Express, MySQL, and Firebase Authentication. This platform is designed to handle modern social interactions, real-time messaging, multi-image sharing, and dynamic content feeds with a polished, highly responsive UI/UX.

---

## 🚀 Features

- **Robust Authentication:** Secure Firebase Authentication (Email/Password & OAuth) seamlessly integrated with a custom backend JWT mechanism for tight route protection.
- **Dynamic Feed:** An engaging, database-driven infinite scroll feed utilizing Intersection Observers for optimal performance.
- **Multi-Image Posts:** Users can share multi-image galleries in their posts with a fully integrated full-screen interactive image viewer.
- **Rich User Profiles:** Complete profile customization including avatars and high-res cover photos. Showcases follower/following metrics, bio, website, and location.
- **Real-Time Capabilities:** Instant one-to-one messaging powered by Socket.IO, enabling live communication and presence.
- **Social Interactions:** Like, comment, share, and seamlessly follow/unfollow creators.
- **Global Theme Engine:** Integrated Light / Dark mode toggling that respects system preferences and persists locally.
- **Enterprise-Grade UI/UX:** Features loading skeletons, toast notifications, error boundaries, beautiful empty states, and dynamic CSS animations.
- **Optimized Performance:** Extensive use of `React.memo`, `useCallback`, and optimized MySQL `GROUP_CONCAT` queries for minimized payload overhead.

---

## 🏗️ Architecture Stack

### Frontend (Client-Side)
*   **Framework:** React 19 + TypeScript + Vite
*   **Routing:** React Router DOM v7
*   **State Management:** React Context API & Custom Hooks
*   **Styling:** CSS Modules with Global Theme Variables (Light/Dark Mode)
*   **Icons:** Lucide React
*   **Notifications:** React Hot Toast
*   **Real-time:** Socket.IO Client

### Backend (Server-Side)
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MySQL (Relational Modeling with Cascade Deletions)
*   **File Uploads:** Multer (multipart/form-data)
*   **Authentication:** Firebase Admin SDK (token verification)
*   **Real-time:** Socket.IO Server
*   **Security:** CORS, Helmet, specialized input validation.

---

## 📂 Folder Structure

```text
📦 CodeAlpha_Social-Media-Platform
 ┣ 📂 backend/
 ┃ ┣ 📂 config/          # Firebase Admin & MySQL connection pool setup
 ┃ ┣ 📂 controllers/     # Route logic (Auth, Posts, Profile, Notifications)
 ┃ ┣ 📂 middleware/      # Firebase JWT validation & Error handling
 ┃ ┣ 📂 models/          # SQL queries encapsulations (MVC pattern)
 ┃ ┣ 📂 routes/          # Express API route configuration
 ┃ ┣ 📂 scripts/         # Automated DB Alter/Init scripts
 ┃ ┣ 📂 uploads/         # Local file storage for images
 ┃ ┗ 📜 server.js        # Entry point for backend and Socket.IO
 ┣ 📂 frontend/
 ┃ ┣ 📂 src/
 ┃ ┃ ┣ 📂 components/    # Reusable UI components (Feed, Navbar, PostCard)
 ┃ ┃ ┣ 📂 context/       # AuthContext, ThemeContext, SocketContext
 ┃ ┃ ┣ 📂 layouts/       # Main, Protected, and Auth layouts
 ┃ ┃ ┣ 📂 pages/         # View layers (Home, Profile, EditProfile, 404, Chat)
 ┃ ┃ ┣ 📂 routes/        # AppRouter & ProtectedRoutes
 ┃ ┃ ┣ 📂 services/      # Axios API integrators (upload, posts, profile)
 ┃ ┃ ┗ 📜 App.tsx        # High-order context wrapper
 ┃ ┗ 📜 vite.config.ts   # Vite configuration
```

---

## ⚙️ Installation & Usage

### Prerequisites
*   Node.js (v18+)
*   MySQL Server (v8.0+)
*   Firebase Project Credentials

### 1. Database Setup
Create your local MySQL database:
```sql
CREATE DATABASE social_app_demo;
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` in the `backend/` directory:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=social_app_demo
```
*Note: Make sure to drop your `firebaseServiceAccountKey.json` inside the `backend/config` folder.*

Run the Database Initialization:
```bash
node scripts/alterDB.js
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Enjoy the application on `http://localhost:5173`.

---

## 🔒 Security Measures

1.  **Firebase JWT Guarding:** Every protected endpoint requires a valid `Bearer Token` parsed and verified via the Firebase Admin SDK.
2.  **SQL Injection Defense:** Strict usage of `mysql2` Prepared Statements (`?`) across the entire Model layer.
3.  **Cascading Relations:** Enforced referential integrity via `ON DELETE CASCADE` ensures no orphaned records exist when users or posts are deleted.
4.  **File Validation:** Multer enforces `.jpg`, `.jpeg`, `.png` validations and caps file uploads to `5MB` to prevent DoS via storage exhaustion.

---

## 🔮 Future Improvements

- **Redis Caching:** Introduce caching for User Profiles and Feeds to lower MySQL query demands on heavy traffic.
- **S3 Integration:** Migrate local `multer` storage to AWS S3 or Cloudinary for distributed asset delivery via CDN.
- **Push Notifications:** Leverage Firebase Cloud Messaging (FCM) to trigger mobile or native desktop alerts for messages and follows.

*Made with passion for the CodeAlpha Engineering Internship.*
