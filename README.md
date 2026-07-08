# PROS: Personal RPG Operating System

**PROS** is a premium, mobile-first, offline-capable progressive web application (PWA) that transforms your real-world actions into character progression. Bridging the gap between productivity tools and gamification, PROS visualizes your life balance, tracks your deep work, and logs your physical training—rewarding you with Experience Points (XP) across multiple life domains.

---

## 🌟 Key Features

* **Gamified Life Tracking**: Log your daily activities (Deep Work, Learning, Creative, Social) and earn XP. Your actions directly level up your personal RPG character.
* **Domain World Map**: A visual, interactive map representing your life domains (Knowledge, Body, Mind, Execution, Expression, Relationships). Over-indexing on one stat makes its corresponding "Island" glow and grow, while neglecting others causes them to wither, helping you avoid "stat-overfitting" and maintain true life balance.
* **True Offline-First Architecture (PWA)**: Built with `@serwist/next` and IndexedDB. Whether you're deep in the gym or on an airplane, you can log activities and finish workouts. Your actions are safely queued locally and automatically synchronized to the cloud the moment you reconnect to the internet.
* **Integrated Fitness Module**: A dedicated "Train" tab that functions like a premium gym tracker. Log your exercises, sets, reps, and weight. The integrated Rules Engine automatically calculates your total lifting volume and converts it directly into `Body XP`.
* **Complex Rules Engine**: A backend engine that applies momentum multipliers, streak bonuses, and dynamic XP scaling based on the intensity and duration of your logged activities.

---

## 🛠 Tech Stack

This project is built on a modern, bleeding-edge web stack optimized for performance and developer experience:

* **Framework**: Next.js 16 (App Router + Turbopack)
* **Database**: PostgreSQL hosted on [Neon](https://neon.tech/) (Serverless Postgres)
* **ORM**: Drizzle ORM
* **Authentication**: NextAuth.js (Auth.js)
* **Styling**: Tailwind CSS (with Glassmorphism & custom glowing aesthetics)
* **PWA & Offline Sync**: Serwist & idb (IndexedDB)
* **Validation**: Zod

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* A [Neon](https://neon.tech/) account for your PostgreSQL database.

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd personal-rpg-operating-system
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add the following variables:
```env
# Your Neon PostgreSQL Connection String
DATABASE_URL="postgresql://user:password@your-neon-host.aws.neon.tech/neondb?sslmode=require"

# NextAuth Secret (Generate one using: openssl rand -base64 32)
NEXTAUTH_SECRET="your-super-secret-key"

# Only required for production (set this to your production URL)
# NEXTAUTH_URL="https://your-domain.com"
```

### 3. Database Setup
Push the Drizzle schema to your Neon database to create the necessary tables:
```bash
npx drizzle-kit push
```

*(Optional)* If you have seed data configured, you can run your seed script to populate default exercises and templates.

### 4. Run the Development Server
Start the Next.js dev server with Turbopack:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. 

---

## 📱 PWA Installation

Because PROS is a Progressive Web App, you can install it directly to your mobile device:
1. Open the app in Safari (iOS) or Chrome (Android).
2. Tap the "Share" button (iOS) or the three-dot menu (Android).
3. Select **"Add to Home Screen"**.
4. The app will now launch in standalone mode, hiding the browser UI and providing a native app experience with offline support!

---

## ☁️ Deployment

The easiest and recommended way to deploy this application is using [Vercel](https://vercel.com/):

1. Push your code to a GitHub repository.
2. Log into Vercel and click **Add New Project**.
3. Import your GitHub repository.
4. Add your `DATABASE_URL` and `NEXTAUTH_SECRET` in the Environment Variables section.
5. Click **Deploy**. Vercel will automatically configure the serverless environment for your Next.js App Router and Server Actions.

---

## 📄 License
This project is for personal use. Feel free to fork and modify it to build your own ultimate life-tracking system!
