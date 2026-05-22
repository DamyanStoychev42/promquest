# PromQuest Deployment Guide

## 1. Backend on Render

Create a new Web Service on Render.

Settings:

```text
Root Directory: server
Build Command: npm install
Start Command: npm start
```

After deployment, copy your backend URL. It will look like:

```text
https://your-backend-name.onrender.com
```

## 2. Frontend on Vercel

Create a new Vercel project.

Settings:

```text
Root Directory: client
Build Command: npm run build
Output Directory: dist
```

Add environment variables in Vercel:

```text
VITE_SOCKET_URL=https://your-backend-name.onrender.com
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 3. Google Maps API security

Restrict the Google Maps key to your Vercel domain once deployed.

Example allowed referrer:

```text
https://your-site.vercel.app/*
```

## 4. Final test

Test from two phones:
- create room
- join room
- complete all games
- final reveal
- music
- photos
- BubaGuesser map