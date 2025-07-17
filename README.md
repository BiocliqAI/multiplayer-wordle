# 🎮 Multiplayer Wordle - Family Circles

A real-time multiplayer Wordle game designed for family game nights and social play. Built with Node.js, Socket.io, and vanilla JavaScript.

## ✨ Features

### 🏠 Family-Friendly Multiplayer
- **Room-based gameplay** with shareable links
- **Up to 7 active players** + unlimited spectators
- **Host controls** for managing game flow
- **Real-time chat** for celebrations and conversations
- **Hint system** to help struggling players

### 🎯 Real Wordle Experience
- **Full Wordle vocabulary** (6,110 words total)
- **Color-coded feedback** (green/yellow/gray tiles)
- **Keyboard highlighting** with guess results
- **Win/lose detection** and celebrations
- **Sound effects** for invalid words

### 🔄 Real-Time Synchronization
- **Live game boards** showing all players' progress
- **Instant guess validation** and feedback
- **Real-time chat messages** and hints
- **Dynamic player status** updates
- **Spectator mode** with seamless joining

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/BiocliqAI/multiplayer-wordle.git
cd multiplayer-wordle

# Install dependencies
npm install

# Start the server
npm start
```

### Play the Game
1. Open your browser to `http://localhost:3000`
2. **Host**: Click "🏠 Create Family Room"
3. **Players**: Join using room code or shared link
4. **Start Playing**: Host picks a word, players guess!

## 🎯 How to Play

### For Hosts
1. **Create a room** with a custom name
2. **Share the room code** or link with family/friends
3. **Start challenges** by picking 5-letter words
4. **Give hints** to help players (up to 20 characters)
5. **Watch progress** of all players in real-time

### For Players
1. **Join a room** using the room code
2. **Click "Join Game"** to participate (vs. spectate)
3. **Make guesses** when host starts a challenge
4. **Use chat** to celebrate wins and interact
5. **Switch to spectator** mode anytime

### Game Rules
- **6 attempts** to guess the host's word
- **Green tiles**: Correct letter in correct position
- **Yellow tiles**: Correct letter in wrong position  
- **Gray tiles**: Letter not in the word
- **Win condition**: Guess the word in 6 tries or less

## 🛠️ Technical Stack

### Backend
- **Node.js** with Express server
- **Socket.io** for real-time communication
- **In-memory storage** for game state (production-ready for Redis)
- **Comprehensive word validation** using official Wordle lists

### Frontend
- **Vanilla JavaScript** (no framework dependencies)
- **CSS Grid & Flexbox** for responsive design
- **Web Audio API** for sound effects
- **Socket.io client** for real-time updates

### Architecture
- **Room-based multiplayer** with unique codes
- **Event-driven communication** via WebSockets
- **Stateful game management** with automatic cleanup
- **Responsive design** for desktop and mobile

## 📁 Project Structure

```
multiplayer-wordle/
├── server.js                 # Main server with Socket.io
├── package.json              # Dependencies and scripts
├── multiplayer-index.html    # Main game interface
├── multiplayer-game.js       # Frontend game logic
├── multiplayer-styles.css    # Responsive styling
├── words.js                  # Wordle word lists
├── debug.html               # Debug/testing page
├── test-challenge-words.js   # Word validation tests
└── README.md                # This file
```

## 🎮 Game Flow

1. **Room Creation**: Host creates room with custom name
2. **Player Joining**: Players join via room code/link
3. **Challenge Start**: Host picks a word and starts challenge
4. **Guess Submission**: Players submit guesses in real-time
5. **Live Updates**: All players see each other's progress
6. **Win/Lose**: Game ends when players guess or run out of attempts
7. **New Round**: Host can start new challenges instantly

## 🧪 Testing

Run the comprehensive word validation test:
```bash
node test-challenge-words.js
```

This tests 100 random words from the Wordle vocabulary to ensure all challenge words work correctly.

## 🌐 Deployment

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production Deployment
1. **Set environment variables**:
   ```bash
   export PORT=3000
   export NODE_ENV=production
   ```

2. **Deploy to cloud platforms**:
   - Heroku, Railway, Render, or any Node.js hosting
   - Supports WebSocket connections
   - No database required (uses in-memory storage)

3. **For scale**: Add Redis for persistent room storage

## 🎯 Key Features Implemented

- ✅ **Real-time multiplayer** with Socket.io
- ✅ **Full Wordle vocabulary** (3,392 target + 2,718 valid words)
- ✅ **Family-friendly features** (hints, spectators, chat)
- ✅ **Responsive design** for all devices
- ✅ **Sound effects** and visual feedback
- ✅ **Room management** with automatic cleanup
- ✅ **Error handling** with user-friendly messages
- ✅ **Comprehensive testing** suite

## 🔧 Configuration

### Server Settings
- **Port**: 3000 (configurable via PORT env var)
- **Room cleanup**: Every 1 hour
- **Max players**: 7 active + unlimited spectators
- **CORS**: Enabled for cross-origin requests

### Game Settings
- **Word length**: 5 letters
- **Max attempts**: 6 guesses
- **Hint length**: 20 characters max
- **Room code**: 6 characters (alphanumeric)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - feel free to use this for your own family game nights!

## 🎉 Acknowledgments

- Inspired by the original Wordle by Josh Wardle
- Built for family fun and social gaming
- Word lists based on official Wordle vocabulary

---

**Ready to play?** Start the server and gather your family for some word-guessing fun! 🎮👨‍👩‍👧‍👦