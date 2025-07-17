const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import word lists from existing Wordle game
const fs = require('fs');

// Load words from existing words.js file
let TARGET_WORDS = [];
let VALID_WORDS = [];

function loadWordLists() {
    try {
        const wordsContent = fs.readFileSync(path.join(__dirname, 'words.js'), 'utf8');
        
        // Extract TARGET_WORDS
        const targetMatch = wordsContent.match(/const TARGET_WORDS = \[(.*?)\];/s);
        if (targetMatch) {
            const targetWordsStr = targetMatch[1];
            TARGET_WORDS = targetWordsStr.match(/"([a-z]{5})"/g)?.map(word => word.replace(/"/g, '').toUpperCase()) || [];
        }
        
        // Extract FINAL_VALID_GUESSES
        const validMatch = wordsContent.match(/const FINAL_VALID_GUESSES = \[(.*?)\];/s);
        if (validMatch) {
            const validWordsStr = validMatch[1];
            VALID_WORDS = validWordsStr.match(/"([a-z]{5})"/g)?.map(word => word.replace(/"/g, '').toUpperCase()) || [];
        }
        
        console.log(`Loaded ${TARGET_WORDS.length} target words and ${VALID_WORDS.length} valid words`);
    } catch (error) {
        console.error('Error loading word lists:', error);
        // Fallback word list
        TARGET_WORDS = ['ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN'];
        VALID_WORDS = [...TARGET_WORDS];
    }
}

loadWordLists();

// In-memory storage for rooms (in production, use Redis or database)
const rooms = new Map();
const playerSockets = new Map(); // socketId -> playerId

class GameRoom {
    constructor(roomCode, roomName, hostId, hostName) {
        this.roomCode = roomCode;
        this.roomName = roomName;
        this.hostId = hostId;
        this.hostName = hostName;
        this.players = new Map();
        this.spectators = new Map();
        this.currentWord = null;
        this.gameActive = false;
        this.hints = [];
        this.chatMessages = [];
        this.playerBoards = new Map(); // playerId -> board state
        this.createdAt = new Date();
        
        // Add host as first member
        this.addPlayer(hostId, hostName, true);
    }
    
    addPlayer(playerId, playerName, isHost = false) {
        const player = {
            id: playerId,
            name: playerName,
            isHost,
            isPlaying: false,
            isSpectating: true,
            socketId: null,
            board: this.createEmptyBoard(),
            currentRow: 0,
            currentCol: 0,
            currentGuess: '',
            gameOver: false,
            gameWon: false
        };
        
        if (isHost) {
            this.players.set(playerId, player);
        } else {
            this.spectators.set(playerId, player);
        }
        
        return player;
    }
    
    createEmptyBoard() {
        return Array(6).fill().map(() => Array(5).fill({ letter: '', state: '' }));
    }
    
    joinAsPlayer(playerId) {
        const player = this.spectators.get(playerId) || this.players.get(playerId);
        if (!player) return false;
        
        // Check if room is full (max 7 players excluding host)
        const activePlayers = Array.from(this.players.values()).filter(p => p.isPlaying && !p.isHost);
        if (activePlayers.length >= 7) return false;
        
        player.isPlaying = true;
        player.isSpectating = false;
        
        // Move from spectators to players if needed
        if (this.spectators.has(playerId)) {
            this.spectators.delete(playerId);
            this.players.set(playerId, player);
        }
        
        return true;
    }
    
    startChallenge(word) {
        const upperWord = word.toUpperCase();
        console.log(`Attempting to start challenge with word: ${upperWord}`);
        console.log(`Is in TARGET_WORDS: ${TARGET_WORDS.includes(upperWord)}`);
        console.log(`Is in VALID_WORDS: ${VALID_WORDS.includes(upperWord)}`);
        
        // For challenges, allow any valid word from either list
        const allValidWords = new Set([...TARGET_WORDS, ...VALID_WORDS]);
        if (!allValidWords.has(upperWord)) {
            console.log(`Word ${upperWord} not found in either TARGET_WORDS or VALID_WORDS`);
            return false;
        }
        
        this.currentWord = upperWord;
        this.gameActive = true;
        this.hints = [];
        
        console.log(`Challenge started successfully with word: ${this.currentWord}`);
        
        // Reset all player boards
        this.players.forEach(player => {
            if (player.isPlaying && !player.isHost) {
                player.board = this.createEmptyBoard();
                player.currentRow = 0;
                player.currentCol = 0;
                player.currentGuess = '';
                player.gameOver = false;
                player.gameWon = false;
            }
        });
        
        return true;
    }
    
    addHint(hint) {
        this.hints.push({
            text: hint,
            timestamp: new Date()
        });
    }
    
    addChatMessage(playerId, message) {
        const player = this.getPlayer(playerId);
        const chatMessage = {
            id: uuidv4(),
            playerId,
            playerName: player ? player.name : 'Unknown',
            isHost: player ? player.isHost : false,
            message,
            timestamp: new Date()
        };
        
        this.chatMessages.push(chatMessage);
        return chatMessage;
    }
    
    getPlayer(playerId) {
        return this.players.get(playerId) || this.spectators.get(playerId);
    }
    
    getAllMembers() {
        const allMembers = [];
        this.players.forEach(player => allMembers.push(player));
        this.spectators.forEach(spectator => allMembers.push(spectator));
        return allMembers;
    }
    
    getPlayerCount() {
        return {
            playing: Array.from(this.players.values()).filter(p => p.isPlaying).length,
            spectating: Array.from(this.spectators.values()).length + 
                       Array.from(this.players.values()).filter(p => !p.isPlaying).length
        };
    }
    
    submitGuess(playerId, guess) {
        const player = this.players.get(playerId);
        if (!player) {
            return { error: 'Player not found in game' };
        }
        if (!player.isPlaying) {
            return { error: 'You must join as a player first' };
        }
        if (player.gameOver) {
            return { error: 'Your game is already over' };
        }
        if (!this.gameActive) {
            return { error: 'No active challenge. Host needs to start a challenge first.' };
        }
        
        guess = guess.toUpperCase();
        
        // Validate guess
        const allValidWords = new Set([...TARGET_WORDS, ...VALID_WORDS]);
        if (!allValidWords.has(guess)) {
            return { error: 'Not in word list' };
        }
        
        if (guess.length !== 5) {
            return { error: 'Must be 5 letters' };
        }
        
        // Check guess against target word
        const results = this.checkGuess(guess, this.currentWord);
        
        // Update player board
        for (let i = 0; i < 5; i++) {
            player.board[player.currentRow][i] = {
                letter: guess[i],
                state: results[i]
            };
        }
        
        // Check win/lose
        if (guess === this.currentWord) {
            player.gameWon = true;
            player.gameOver = true;
        } else if (player.currentRow === 5) {
            player.gameOver = true;
        }
        
        player.currentRow++;
        player.currentGuess = '';
        player.currentCol = 0;
        
        return {
            guess,
            results,
            won: player.gameWon,
            gameOver: player.gameOver,
            board: player.board
        };
    }
    
    checkGuess(guess, target) {
        const results = [];
        const targetLetters = target.split('');
        const guessLetters = guess.split('');

        // First pass: mark correct positions
        for (let i = 0; i < 5; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                results[i] = 'correct';
                targetLetters[i] = null;
                guessLetters[i] = null;
            }
        }

        // Second pass: mark present letters
        for (let i = 0; i < 5; i++) {
            if (guessLetters[i] && targetLetters.includes(guessLetters[i])) {
                results[i] = 'present';
                targetLetters[targetLetters.indexOf(guessLetters[i])] = null;
            } else if (guessLetters[i]) {
                results[i] = 'absent';
            }
        }

        return results;
    }
}

// Utility functions
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function isValidWord(word) {
    const allValidWords = new Set([...TARGET_WORDS, ...VALID_WORDS]);
    return allValidWords.has(word.toUpperCase());
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Create room
    socket.on('create-room', (data) => {
        const { roomName, hostName } = data;
        const roomCode = generateRoomCode();
        const hostId = uuidv4();
        
        // Store player socket mapping
        playerSockets.set(socket.id, hostId);
        
        // Create room
        const room = new GameRoom(roomCode, roomName, hostId, hostName);
        rooms.set(roomCode, room);
        
        // Set host socket
        const host = room.getPlayer(hostId);
        host.socketId = socket.id;
        
        // Join socket room
        socket.join(roomCode);
        
        console.log(`Room created: ${roomCode} by ${hostName}`);
        
        socket.emit('room-created', {
            roomCode,
            roomName,
            playerId: hostId,
            playerName: hostName,
            isHost: true
        });
        
        // Send initial room state
        emitRoomState(roomCode);
    });
    
    // Join room
    socket.on('join-room', (data) => {
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        const playerId = uuidv4();
        playerSockets.set(socket.id, playerId);
        
        // Add as spectator initially
        const player = room.addPlayer(playerId, playerName, false);
        player.socketId = socket.id;
        
        // Join socket room
        socket.join(roomCode);
        
        console.log(`${playerName} joined room ${roomCode}`);
        
        socket.emit('room-joined', {
            roomCode,
            roomName: room.roomName,
            playerId,
            playerName,
            isHost: false
        });
        
        // Add system message
        const chatMessage = room.addChatMessage('system', `${playerName} joined the room`);
        
        // Broadcast to all users in room
        io.to(roomCode).emit('chat-message', chatMessage);
        emitRoomState(roomCode);
    });
    
    // Join as player
    socket.on('join-as-player', (data) => {
        const { roomCode, playerId } = data;
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        const success = room.joinAsPlayer(playerId);
        if (!success) {
            socket.emit('error', { message: 'Game is full (7 players max)' });
            return;
        }
        
        const player = room.getPlayer(playerId);
        console.log(`${player.name} joined as player in room ${roomCode}`);
        
        // Add system message
        const chatMessage = room.addChatMessage('system', `${player.name} joined as a player`);
        io.to(roomCode).emit('chat-message', chatMessage);
        
        socket.emit('joined-as-player', { success: true });
        emitRoomState(roomCode);
    });
    
    // Start challenge
    socket.on('start-challenge', (data) => {
        const { roomCode, word, playerId } = data;
        console.log(`Start challenge request: room=${roomCode}, word=${word}, playerId=${playerId}`);
        
        const room = rooms.get(roomCode);
        
        if (!room) {
            console.log(`Room ${roomCode} not found`);
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        if (room.hostId !== playerId) {
            console.log(`Player ${playerId} is not the host (host is ${room.hostId})`);
            socket.emit('error', { message: 'Only host can start challenges' });
            return;
        }
        
        console.log(`Validating word: ${word}`);
        if (!isValidWord(word)) {
            console.log(`Word ${word} failed validation`);
            socket.emit('error', { message: 'Choose another word', playBuzzer: true });
            return;
        }
        
        console.log(`Starting challenge with word: ${word}`);
        const success = room.startChallenge(word);
        if (!success) {
            console.log(`Failed to start challenge with word: ${word}`);
            socket.emit('error', { message: 'Choose another word', playBuzzer: true });
            return;
        }
        
        console.log(`Challenge started in room ${roomCode}: ${word}`);
        
        // Add system message
        const chatMessage = room.addChatMessage('system', `New challenge started! The word is ${word.length} letters long.`);
        io.to(roomCode).emit('chat-message', chatMessage);
        
        io.to(roomCode).emit('challenge-started', {
            wordLength: word.length
        });
        
        emitRoomState(roomCode);
    });
    
    // Send hint
    socket.on('send-hint', (data) => {
        const { roomCode, hint, playerId } = data;
        const room = rooms.get(roomCode);
        
        if (!room || room.hostId !== playerId) {
            socket.emit('error', { message: 'Only host can send hints' });
            return;
        }
        
        room.addHint(hint);
        
        console.log(`Hint sent in room ${roomCode}: ${hint}`);
        
        io.to(roomCode).emit('hint-received', {
            hint,
            timestamp: new Date()
        });
        
        // Add to chat
        const chatMessage = room.addChatMessage(playerId, `💡 Hint: ${hint}`);
        io.to(roomCode).emit('chat-message', chatMessage);
    });
    
    // Submit guess
    socket.on('submit-guess', (data) => {
        const { roomCode, guess, playerId } = data;
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        const result = room.submitGuess(playerId, guess);
        if (!result) {
            socket.emit('error', { message: 'Cannot submit guess' });
            return;
        }
        
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }
        
        const player = room.getPlayer(playerId);
        console.log(`${player.name} guessed: ${guess} in room ${roomCode}`);
        
        socket.emit('guess-result', result);
        
        // Check for win
        if (result.won) {
            const chatMessage = room.addChatMessage('system', `🎉 ${player.name} solved the word: ${room.currentWord}!`);
            io.to(roomCode).emit('chat-message', chatMessage);
        } else if (result.gameOver) {
            const chatMessage = room.addChatMessage('system', `${player.name} didn't solve it this time.`);
            io.to(roomCode).emit('chat-message', chatMessage);
        }
        
        emitRoomState(roomCode);
    });
    
    // Chat message
    socket.on('chat-message', (data) => {
        const { roomCode, message, playerId } = data;
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        const chatMessage = room.addChatMessage(playerId, message);
        io.to(roomCode).emit('chat-message', chatMessage);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        const playerId = playerSockets.get(socket.id);
        if (playerId) {
            playerSockets.delete(socket.id);
            
            // Find and update player in rooms
            rooms.forEach((room, roomCode) => {
                const player = room.getPlayer(playerId);
                if (player) {
                    player.socketId = null;
                    console.log(`${player.name} disconnected from room ${roomCode}`);
                    
                    // Optionally remove player after timeout or keep them in room
                    // For now, we'll keep them in the room
                    emitRoomState(roomCode);
                }
            });
        }
    });
    
    function emitRoomState(roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;
        
        const roomState = {
            roomCode: room.roomCode,
            roomName: room.roomName,
            hostId: room.hostId,
            hostName: room.hostName,
            gameActive: room.gameActive,
            currentWord: room.currentWord,
            hints: room.hints,
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost,
                isPlaying: p.isPlaying,
                isSpectating: p.isSpectating,
                gameOver: p.gameOver,
                gameWon: p.gameWon,
                board: p.board,
                connected: p.socketId !== null
            })),
            spectators: Array.from(room.spectators.values()).map(s => ({
                id: s.id,
                name: s.name,
                isHost: s.isHost,
                isPlaying: s.isPlaying,
                isSpectating: s.isSpectating,
                connected: s.socketId !== null
            })),
            playerCount: room.getPlayerCount(),
            chatMessages: room.chatMessages.slice(-50) // Last 50 messages
        };
        
        io.to(roomCode).emit('room-state', roomState);
    }
});

// API Routes
app.get('/api/room/:roomCode', (req, res) => {
    const { roomCode } = req.params;
    const room = rooms.get(roomCode);
    
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
        roomCode: room.roomCode,
        roomName: room.roomName,
        playerCount: room.getPlayerCount(),
        gameActive: room.gameActive
    });
});

app.get('/api/validate-word/:word', (req, res) => {
    const { word } = req.params;
    const isValid = isValidWord(word);
    res.json({ valid: isValid });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'multiplayer-index.html'));
});

// Serve debug page
app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug.html'));
});

// Serve static files (after routes to prevent conflicts)
app.use(express.static(path.join(__dirname)));

// Clean up old rooms periodically (every hour)
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    rooms.forEach((room, roomCode) => {
        if (room.createdAt < oneHourAgo) {
            console.log(`Cleaning up old room: ${roomCode}`);
            rooms.delete(roomCode);
        }
    });
}, 60 * 60 * 1000);

server.listen(PORT, () => {
    console.log(`Wordle Family Circles server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play!`);
});