// Multiplayer Wordle Game Logic
class MultiplayerWordle {
    constructor() {
        this.socket = null;
        this.gameState = {
            roomCode: null,
            roomName: null,
            playerId: null,
            isHost: false,
            playerName: null,
            isPlaying: false,
            currentWord: null,
            currentGuess: '',
            currentRow: 0,
            currentCol: 0,
            gameOver: false,
            gameWon: false,
            players: [],
            spectators: [],
            chatMessages: [],
            hints: []
        };
        
        this.initializeSocket();
        this.initializeScreens();
        this.setupEventListeners();
        this.loadWordList();
    }

    initializeSocket() {
        this.socket = io();
        
        // Room creation response
        this.socket.on('room-created', (data) => {
            this.gameState.roomCode = data.roomCode;
            this.gameState.roomName = data.roomName;
            this.gameState.playerId = data.playerId;
            this.gameState.playerName = data.playerName;
            this.gameState.isHost = data.isHost;
            this.gameState.isPlaying = false;
            
            this.initializeRoom();
            this.showScreen('game-room');
            this.showToast('Room created successfully!', 'success');
        });
        
        // Room join response
        this.socket.on('room-joined', (data) => {
            this.gameState.roomCode = data.roomCode;
            this.gameState.roomName = data.roomName;
            this.gameState.playerId = data.playerId;
            this.gameState.playerName = data.playerName;
            this.gameState.isHost = data.isHost;
            this.gameState.isPlaying = false;
            
            this.initializeRoom();
            this.showScreen('game-room');
            this.showToast('Joined room successfully!', 'success');
        });
        
        // Room state updates
        this.socket.on('room-state', (roomState) => {
            this.updateFromRoomState(roomState);
        });
        
        // Chat messages
        this.socket.on('chat-message', (message) => {
            this.displayChatMessage(message);
        });
        
        // Challenge started
        this.socket.on('challenge-started', (data) => {
            document.getElementById('waiting-message').style.display = 'none';
            this.showToast('New challenge started!', 'success');
            // Reset the game board for new challenge
            this.resetGameBoard();
        });
        
        // Hints
        this.socket.on('hint-received', (data) => {
            document.getElementById('hint-display').style.display = 'block';
            document.getElementById('current-hint').textContent = data.hint;
        });
        
        // Guess results
        this.socket.on('guess-result', (result) => {
            this.handleGuessResult(result);
        });
        
        // Player joined as player
        this.socket.on('joined-as-player', (data) => {
            if (data.success) {
                this.gameState.isPlaying = true;
                this.updatePlayerStatus();
                this.showToast('You are now playing!', 'success');
            }
        });
        
        // Error handling
        this.socket.on('error', (error) => {
            this.showToast(error.message, 'error');
            if (error.playBuzzer) {
                this.playBuzzer();
            }
        });
    }

    initializeScreens() {
        // Show main menu by default
        this.showScreen('main-menu');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    setupEventListeners() {
        // Main Menu
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.showScreen('room-setup');
        });

        document.getElementById('single-player-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.joinRoom();
        });

        // Room Setup
        document.getElementById('create-room-confirm').addEventListener('click', () => {
            this.createRoom();
        });

        document.getElementById('back-to-menu').addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // Host Controls
        document.getElementById('new-challenge-btn').addEventListener('click', () => {
            this.startNewChallenge();
        });

        document.getElementById('submit-word-btn').addEventListener('click', () => {
            this.submitChallengeWord();
        });

        document.getElementById('cancel-word-btn').addEventListener('click', () => {
            this.cancelWordInput();
        });

        document.getElementById('send-hint-btn').addEventListener('click', () => {
            this.sendHint();
        });

        // Hint input character counter
        document.getElementById('hint-input').addEventListener('input', (e) => {
            document.getElementById('hint-char-count').textContent = e.target.value.length;
        });

        // Player Controls
        document.getElementById('join-as-player-btn').addEventListener('click', () => {
            this.joinAsPlayer();
        });

        // Chat
        document.getElementById('send-chat-btn').addEventListener('click', () => {
            this.sendChatMessage();
        });

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        // Copy room link
        document.getElementById('copy-link-btn').addEventListener('click', () => {
            this.copyRoomLink();
        });

        // Challenge word input
        document.getElementById('challenge-word').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        document.getElementById('challenge-word').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitChallengeWord();
            }
        });

        // Room code input
        document.getElementById('room-code-input').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        document.getElementById('room-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });

        // Hint input
        document.getElementById('hint-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendHint();
            }
        });

        // Parse URL for room joining
        this.parseURL();
    }

    parseURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room');
        if (roomCode) {
            document.getElementById('room-code-input').value = roomCode;
            // Auto-show join prompt
            this.showJoinPrompt();
        }
    }

    showJoinPrompt() {
        const roomCode = document.getElementById('room-code-input').value;
        if (roomCode) {
            const playerName = prompt(`Enter your name to join room ${roomCode}:`);
            if (playerName) {
                this.joinRoomWithCode(roomCode, playerName);
            }
        }
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    createRoom() {
        console.log('createRoom function called');
        const roomName = document.getElementById('room-name').value.trim();
        const hostName = document.getElementById('host-name').value.trim();
        console.log('Room name:', roomName, 'Host name:', hostName);

        if (!roomName || !hostName) {
            console.log('Missing fields, showing error');
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        console.log('Emitting create-room event to server');
        // Send room creation request to server
        this.socket.emit('create-room', {
            roomName,
            hostName
        });
    }

    joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim();
        if (!roomCode) {
            this.showToast('Please enter a room code', 'error');
            return;
        }

        const playerName = prompt('Enter your name:');
        if (!playerName) return;

        this.joinRoomWithCode(roomCode, playerName);
    }

    joinRoomWithCode(roomCode, playerName) {
        // Send room join request to server
        this.socket.emit('join-room', {
            roomCode,
            playerName
        });
    }

    initializeRoom() {
        // Set up room display
        document.getElementById('room-title').textContent = this.gameState.roomName;
        document.getElementById('current-room-code').textContent = this.gameState.roomCode;

        // Show/hide host controls
        const hostControls = document.getElementById('host-controls');
        if (this.gameState.isHost) {
            hostControls.style.display = 'block';
        } else {
            hostControls.style.display = 'none';
        }

        // Initialize as spectator
        this.updatePlayerStatus();
        this.createGameBoard();
        this.createKeyboard();
    }

    startNewChallenge() {
        if (!this.gameState.isHost) return;

        document.getElementById('word-input-section').style.display = 'block';
        document.getElementById('challenge-word').focus();
    }

    submitChallengeWord() {
        const word = document.getElementById('challenge-word').value.trim().toUpperCase();
        
        if (word.length !== 5) {
            this.showToast('Word must be 5 letters long', 'error');
            return;
        }

        // Send challenge to server
        this.socket.emit('start-challenge', {
            roomCode: this.gameState.roomCode,
            word: word,
            playerId: this.gameState.playerId
        });
        
        // Hide word input, show hint controls
        document.getElementById('word-input-section').style.display = 'none';
        document.getElementById('hint-section').style.display = 'block';
        document.getElementById('challenge-word').value = '';
    }

    cancelWordInput() {
        document.getElementById('word-input-section').style.display = 'none';
        document.getElementById('challenge-word').value = '';
    }

    sendHint() {
        const hint = document.getElementById('hint-input').value.trim();
        if (!hint) return;

        // Send hint to server
        this.socket.emit('send-hint', {
            roomCode: this.gameState.roomCode,
            hint: hint,
            playerId: this.gameState.playerId
        });

        // Clear hint input
        document.getElementById('hint-input').value = '';
        document.getElementById('hint-char-count').textContent = '0';
    }

    joinAsPlayer() {
        // Send join as player request to server
        this.socket.emit('join-as-player', {
            roomCode: this.gameState.roomCode,
            playerId: this.gameState.playerId
        });
    }

    updatePlayerStatus() {
        const joinSection = document.getElementById('join-game-section');
        const gameArea = document.getElementById('player-game-area');

        if (this.gameState.isPlaying) {
            joinSection.style.display = 'none';
            gameArea.style.display = 'block';
        } else {
            joinSection.style.display = 'block';
            gameArea.style.display = 'none';
        }

        this.updatePlayerList();
    }

    createGameBoard() {
        const board = document.getElementById('my-game-board');
        board.innerHTML = '';

        for (let row = 0; row < 6; row++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'board-row';
            rowDiv.id = `row-${row}`;
            
            for (let col = 0; col < 5; col++) {
                const tile = document.createElement('div');
                tile.className = 'board-tile';
                tile.id = `tile-${row}-${col}`;
                rowDiv.appendChild(tile);
            }
            
            board.appendChild(rowDiv);
        }
    }

    createKeyboard() {
        const keyboard = document.getElementById('my-keyboard');
        keyboard.innerHTML = '';

        const rows = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
        ];

        rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            
            row.forEach(key => {
                const keyButton = document.createElement('button');
                keyButton.className = 'key';
                keyButton.textContent = key;
                
                if (key === 'ENTER' || key === '⌫') {
                    keyButton.classList.add('wide');
                }
                
                keyButton.addEventListener('click', () => this.handleKeyPress(key));
                rowDiv.appendChild(keyButton);
            });
            
            keyboard.appendChild(rowDiv);
        });

        // Add physical keyboard support
        document.addEventListener('keydown', (e) => {
            if (!this.gameState.isPlaying) return;
            
            if (e.key === 'Enter') {
                this.handleKeyPress('ENTER');
            } else if (e.key === 'Backspace') {
                this.handleKeyPress('⌫');
            } else if (e.key.match(/[a-zA-Z]/)) {
                this.handleKeyPress(e.key.toUpperCase());
            }
        });
    }

    handleKeyPress(key) {
        if (!this.gameState.isPlaying || this.gameState.gameOver) return;

        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === '⌫') {
            this.deleteLetter();
        } else if (key.match(/[A-Z]/) && this.gameState.currentCol < 5) {
            this.addLetter(key);
        }
    }

    addLetter(letter) {
        if (this.gameState.currentCol < 5) {
            const tile = document.getElementById(`tile-${this.gameState.currentRow}-${this.gameState.currentCol}`);
            tile.textContent = letter;
            tile.classList.add('filled');
            this.gameState.currentGuess += letter;
            this.gameState.currentCol++;
        }
    }

    deleteLetter() {
        if (this.gameState.currentCol > 0) {
            this.gameState.currentCol--;
            const tile = document.getElementById(`tile-${this.gameState.currentRow}-${this.gameState.currentCol}`);
            tile.textContent = '';
            tile.classList.remove('filled');
            this.gameState.currentGuess = this.gameState.currentGuess.slice(0, -1);
        }
    }

    submitGuess() {
        if (this.gameState.currentCol !== 5) {
            this.showToast('Not enough letters', 'error');
            return;
        }

        const guess = this.gameState.currentGuess;
        
        // Send guess to server
        this.socket.emit('submit-guess', {
            roomCode: this.gameState.roomCode,
            guess: guess,
            playerId: this.gameState.playerId
        });
    }

    checkGuess(guess) {
        const target = this.gameState.currentWord;
        const results = this.getGuessResults(guess, target);
        
        // Update tiles
        for (let i = 0; i < 5; i++) {
            const tile = document.getElementById(`tile-${this.gameState.currentRow}-${i}`);
            tile.classList.add(results[i]);
        }

        // Update keyboard
        this.updateKeyboard(guess, results);

        // Check win/lose
        if (guess === target) {
            this.gameState.gameWon = true;
            this.gameState.gameOver = true;
            this.addChatMessage('System', `🎉 ${this.gameState.playerName} solved the word: ${target}!`);
            this.showToast('You won!', 'success');
        } else if (this.gameState.currentRow === 5) {
            this.gameState.gameOver = true;
            this.addChatMessage('System', `${this.gameState.playerName} didn't solve it. The word was: ${target}`);
            this.showToast(`Game over! Word was: ${target}`, 'error');
        }

        // Move to next row
        this.gameState.currentRow++;
        this.gameState.currentCol = 0;
        this.gameState.currentGuess = '';

        // Update spectator view with new guess
        this.updateSpectatorView();
    }

    getGuessResults(guess, target) {
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

    updateKeyboard(guess, results) {
        for (let i = 0; i < 5; i++) {
            const letter = guess[i];
            const key = document.querySelector(`.key:not(.wide)`);
            const keys = document.querySelectorAll('.key');
            
            keys.forEach(keyEl => {
                if (keyEl.textContent === letter) {
                    if (results[i] === 'correct') {
                        keyEl.classList.add('correct');
                        keyEl.classList.remove('present', 'absent');
                    } else if (results[i] === 'present' && !keyEl.classList.contains('correct')) {
                        keyEl.classList.add('present');
                        keyEl.classList.remove('absent');
                    } else if (results[i] === 'absent' && !keyEl.classList.contains('correct') && !keyEl.classList.contains('present')) {
                        keyEl.classList.add('absent');
                    }
                }
            });
        }
    }

    updateSpectatorView() {
        const container = document.getElementById('all-boards-container');
        container.innerHTML = '';

        // Show boards for all playing players
        this.gameState.players.forEach(player => {
            if (player.isPlaying) {
                const playerBoard = this.createPlayerBoard(player);
                container.appendChild(playerBoard);
            }
        });
    }

    createPlayerBoard(player) {
        const boardDiv = document.createElement('div');
        boardDiv.className = 'player-board';
        if (player.isHost) {
            boardDiv.classList.add('host');
        }

        const nameDiv = document.createElement('div');
        nameDiv.className = 'player-name';
        nameDiv.textContent = player.name + (player.isHost ? ' (Host)' : '');
        if (player.gameWon) {
            nameDiv.textContent += ' 🏆';
        } else if (player.gameOver) {
            nameDiv.textContent += ' ❌';
        }
        boardDiv.appendChild(nameDiv);

        const miniBoard = document.createElement('div');
        miniBoard.className = 'mini-board';

        for (let row = 0; row < 6; row++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'mini-row';
            
            for (let col = 0; col < 5; col++) {
                const tile = document.createElement('div');
                tile.className = 'mini-tile';
                
                // Use board data from server
                if (player.board && player.board[row] && player.board[row][col]) {
                    const tileData = player.board[row][col];
                    if (tileData.letter) {
                        tile.textContent = '●'; // Hide letters for spectators, show colors only
                        if (tileData.state) {
                            tile.classList.add(tileData.state);
                        }
                    }
                }
                
                rowDiv.appendChild(tile);
            }
            
            miniBoard.appendChild(rowDiv);
        }

        boardDiv.appendChild(miniBoard);
        return boardDiv;
    }

    resetGameBoard() {
        // Reset game state
        this.gameState.currentRow = 0;
        this.gameState.currentCol = 0;
        this.gameState.currentGuess = '';
        this.gameState.gameOver = false;
        this.gameState.gameWon = false;

        // Clear tiles
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 5; col++) {
                const tile = document.getElementById(`tile-${row}-${col}`);
                if (tile) {
                    tile.textContent = '';
                    tile.className = 'board-tile';
                }
            }
        }

        // Reset keyboard
        document.querySelectorAll('.key').forEach(key => {
            key.className = key.classList.contains('wide') ? 'key wide' : 'key';
        });
    }

    resetAllPlayerBoards() {
        // Reset own board
        this.resetGameBoard();
        // Update spectator view
        this.updateSpectatorView();
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Send chat message to server
        this.socket.emit('chat-message', {
            roomCode: this.gameState.roomCode,
            message: message,
            playerId: this.gameState.playerId
        });
        
        input.value = '';
    }

    updateFromRoomState(roomState) {
        this.gameState.players = roomState.players || [];
        this.gameState.spectators = roomState.spectators || [];
        this.gameState.currentWord = roomState.currentWord;
        
        // Update displays
        this.updatePlayerList();
        this.updateSpectatorView();
        
        // Update player counts
        const playingCount = roomState.players.filter(p => p.isPlaying).length;
        const spectatingCount = roomState.spectators.length + roomState.players.filter(p => !p.isPlaying).length;
        
        document.getElementById('player-count').textContent = `Players: ${playingCount}/7`;
        document.getElementById('spectator-count').textContent = `Spectators: ${spectatingCount}`;
    }

    displayChatMessage(message) {
        const container = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        if (message.isHost) {
            messageDiv.classList.add('host');
        }

        messageDiv.innerHTML = `
            <div class="message-author">${message.playerName}</div>
            <div class="message-text">${message.message}</div>
        `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    handleGuessResult(result) {
        if (result.error) {
            this.showToast(result.error, 'error');
            return;
        }

        // Update tiles
        for (let i = 0; i < 5; i++) {
            const tile = document.getElementById(`tile-${this.gameState.currentRow}-${i}`);
            tile.classList.add(result.results[i]);
        }

        // Update keyboard
        this.updateKeyboard(result.guess, result.results);

        // Check win/lose
        if (result.won) {
            this.gameState.gameWon = true;
            this.gameState.gameOver = true;
            this.showToast('You won!', 'success');
        } else if (result.gameOver) {
            this.gameState.gameOver = true;
            this.showToast(`Game over! Word was: ${this.gameState.currentWord}`, 'error');
        }

        // Move to next row
        this.gameState.currentRow++;
        this.gameState.currentCol = 0;
        this.gameState.currentGuess = '';
    }

    addChatMessage(author, text) {
        // This is now handled by displayChatMessage for socket messages
        // Keep for backwards compatibility with local messages
        this.displayChatMessage({
            playerName: author,
            message: text,
            isHost: author === this.gameState.playerName && this.gameState.isHost
        });
    }

    updatePlayerList() {
        const container = document.getElementById('players-container');
        container.innerHTML = '';

        // Combine players and spectators
        const allMembers = [...this.gameState.players, ...this.gameState.spectators];

        allMembers.forEach(member => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'player-name-role';
            nameDiv.textContent = member.name;
            
            const statusDiv = document.createElement('div');
            statusDiv.className = 'player-status';
            
            if (member.isHost) {
                statusDiv.textContent = 'Host';
                statusDiv.classList.add('host');
            } else if (member.isPlaying) {
                statusDiv.textContent = 'Playing';
                statusDiv.classList.add('playing');
            } else {
                statusDiv.textContent = 'Spectating';
                statusDiv.classList.add('spectating');
            }
            
            // Add connection status
            if (!member.connected) {
                statusDiv.textContent += ' (Disconnected)';
                statusDiv.style.opacity = '0.6';
            }
            
            playerDiv.appendChild(nameDiv);
            playerDiv.appendChild(statusDiv);
            container.appendChild(playerDiv);
        });
    }

    copyRoomLink() {
        const roomLink = `${window.location.origin}${window.location.pathname}?room=${this.gameState.roomCode}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(roomLink).then(() => {
                this.showToast('Room link copied!', 'success');
            });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = roomLink;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('Room link copied!', 'success');
        }
    }

    updateRoomDisplay() {
        document.getElementById('room-title').textContent = this.gameState.roomName;
        document.getElementById('current-room-code').textContent = this.gameState.roomCode;
    }

    loadWordList() {
        // Use words from the existing words.js file
        // For demo purposes, we'll use a simple word validation
        this.validWords = new Set([
            'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
            'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE',
            'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMBER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART',
            'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AUDIO',
            'AUDIT', 'AVOID', 'AWAKE', 'AWARD', 'AWARE', 'BADLY', 'BAKER', 'BALLS', 'BANDS', 'BASIC',
            'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELLY', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK',
            'BLAME', 'BLANK', 'BLAST', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD', 'BOOST', 'BOOTH', 'BOUND',
            'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING', 'BROAD',
            'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER', 'CABLE', 'CALIF', 'CARRY', 'CATCH', 'CAUSE',
            'CHAIN', 'CHAIR', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF',
            'CHILD', 'CHINA', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLIMB',
            'CLOCK', 'CLOSE', 'CLOUD', 'COACH', 'COAST', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRAFT',
            'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CURVE', 'CYCLE',
            'DAILY', 'DANCE', 'DATED', 'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT',
            'DOZEN', 'DRAFT', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS', 'DRILL', 'DRINK', 'DRIVE',
            'DROVE', 'DYING', 'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY', 'ENJOY',
            'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAITH',
            'FALSE', 'FAULT', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED',
            'FLASH', 'FLEET', 'FLOOR', 'FLUID', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND',
            'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN',
            'GLASS', 'GLOBE', 'GOING', 'GRACE', 'GRADE', 'GRAND', 'GRANT', 'GRASS', 'GRAVE', 'GREAT',
            'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HAPPY', 'HARRY',
            'HEART', 'HEAVY', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER',
            'INPUT', 'ISSUE', 'JAPAN', 'JIMMY', 'JOINT', 'JONES', 'JUDGE', 'KNOWN', 'LABEL', 'LARGE',
            'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL',
            'LEWIS', 'LIGHT', 'LIMIT', 'LINKS', 'LIVES', 'LOCAL', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH',
            'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MARIA', 'MATCH', 'MAYBE', 'MAYOR', 'MEANT',
            'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL',
            'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVED', 'MOVIE', 'MUSIC', 'NEEDS', 'NEVER', 'NEWER',
            'NEWLY', 'NIGHT', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER',
            'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER', 'PARKS', 'PARTS', 'PARTY',
            'PEACE', 'PETER', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PICKED', 'PIECE', 'PILOT', 'PITCH',
            'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE',
            'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUERY',
            'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REALM',
            'REBEL', 'REFER', 'RELAX', 'REPLY', 'RIGHT', 'RIGID', 'RIVER', 'ROBOT', 'ROCKY', 'ROGER',
            'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE',
            'SENSE', 'SERVE', 'SEVEN', 'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL',
            'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SHOWN', 'SIDES', 'SIGHT', 'SILLY', 'SINCE',
            'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH',
            'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED',
            'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START',
            'STATE', 'STAYS', 'STEAL', 'STEEL', 'STEEP', 'STEER', 'STICK', 'STILL', 'STOCK', 'STONE',
            'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR',
            'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEAMS', 'TEETH',
            'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING',
            'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT', 'TIMER', 'TIRED',
            'TITLE', 'TODAY', 'TOKEN', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN',
            'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TRULY', 'TRUNK', 'TRUST',
            'TRUTH', 'TWICE', 'TWINS', 'TWIST', 'TYPED', 'UNDER', 'UNDUE', 'UNION', 'UNITY', 'UNTIL',
            'UPPER', 'UPSET', 'URBAN', 'URGED', 'USAGE', 'USED', 'USER', 'USERS', 'USING', 'USUAL',
            'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE', 'WATCH', 'WATER',
            'WAVES', 'WAYS', 'WEIRD', 'WELCOME', 'WELLS', 'WELSH', 'WENT', 'WERE', 'WHAT', 'WHEEL',
            'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WIDELY', 'WIDEN', 'WIDER', 'WIDOW',
            'WIDTH', 'WILDE', 'WILLS', 'WINDS', 'WINES', 'WINGS', 'WIRED', 'WIRES', 'WISE', 'WISH',
            'WITH', 'WIVES', 'WOMAN', 'WOMEN', 'WORDS', 'WORKS', 'WORLD', 'WORRY', 'WORSE', 'WORST',
            'WORTH', 'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YEARS', 'YOUNG', 'YOURS', 'YOUTH'
        ]);
    }

    isValidWord(word) {
        return this.validWords.has(word.toUpperCase());
    }

    playBuzzer() {
        // Create a buzzer sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Buzzer sound: low frequency, short duration
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.type = 'sawtooth';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Audio not supported:', error);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show';
        
        if (type) {
            toast.classList.add(type);
        }
        
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    try {
        const game = new MultiplayerWordle();
        console.log('Game initialized successfully');
        window.game = game; // For debugging
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});