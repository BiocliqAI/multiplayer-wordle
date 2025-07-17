# 🚀 Deployment Guide

## Why Netlify Shows Single-Player Version

**Netlify is a static hosting platform** that can only serve HTML, CSS, and JavaScript files. The multiplayer Wordle requires:

- **Node.js server** for game logic
- **Socket.io** for real-time communication  
- **Server-side state management** for rooms and players

Therefore, Netlify automatically serves `index.html` (single-player) instead of the multiplayer version.

## ✅ Recommended Deployment Platforms

### 1. **Railway** (Easiest)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

**Why Railway?**
- ✅ Automatic Node.js detection
- ✅ Free tier available
- ✅ Git integration
- ✅ WebSocket support
- ✅ One-click deployment

### 2. **Render** (Free Tier)
1. Go to [render.com](https://render.com)
2. Connect GitHub repository: `BiocliqAI/multiplayer-wordle`
3. Create **Web Service** (not static site)
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node.js

### 3. **Heroku**
```bash
# Install Heroku CLI, then:
heroku login
heroku create multiplayer-wordle-app
git push heroku main
```

### 4. **Vercel** (Requires Configuration)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## 📋 Pre-Deployment Checklist

### Environment Variables
Set these on your hosting platform:
```bash
PORT=3000
NODE_ENV=production
```

### Required Files (Already in Repository)
- ✅ `package.json` - Dependencies and scripts
- ✅ `server.js` - Main server file
- ✅ `multiplayer-index.html` - Game interface
- ✅ `words.js` - Wordle vocabulary
- ✅ All static assets

### Platform-Specific Notes

**Railway:**
- Automatically detects Node.js
- No configuration needed
- Supports WebSockets out of the box

**Render:**
- Select "Web Service" not "Static Site"
- Build command: `npm install`
- Start command: `npm start`

**Heroku:**
- Add `"engines": {"node": ">=14.0.0"}` in package.json ✅ (already added)
- Uses `npm start` automatically

**Vercel:**
- May require `vercel.json` configuration
- Supports Node.js functions

## 🎯 Quick Deploy Commands

### Railway (Recommended)
```bash
npx @railway/cli login
npx @railway/cli link
npx @railway/cli up
```

### Render
1. Connect repository at render.com
2. Select "Web Service"
3. Deploy automatically

### Heroku
```bash
heroku create your-app-name
git push heroku main
```

## 🔍 Testing Your Deployment

After deployment, test these features:
1. **Room Creation**: Create a new family room
2. **Multiplayer Join**: Join with room code
3. **Real-time Sync**: Multiple players in same room
4. **Challenge Words**: Try CRANE, HEART, AUDIO
5. **Chat & Hints**: Test communication features

## 📝 Post-Deployment

### Custom Domain (Optional)
Most platforms support custom domains:
- Railway: Add domain in dashboard
- Render: Custom domain in settings
- Heroku: `heroku domains:add`

### Environment Variables
Set if needed:
```bash
# Railway
railway variables set NODE_ENV=production

# Render  
# Set in dashboard environment section

# Heroku
heroku config:set NODE_ENV=production
```

## 🚨 Common Issues

**WebSocket Connection Failed:**
- Ensure platform supports WebSockets
- Check firewall settings
- Verify Socket.io configuration

**Static Assets Not Loading:**
- Confirm `express.static` middleware is configured
- Check file paths in HTML

**Port Issues:**
- Use `process.env.PORT || 3000` in server.js ✅ (already configured)

## 🎉 Success!

Once deployed, your multiplayer Wordle will be accessible at:
- **Railway**: `https://your-app.railway.app`
- **Render**: `https://your-app.onrender.com`
- **Heroku**: `https://your-app.herokuapp.com`

Share the URL with family and friends to start playing! 🎮