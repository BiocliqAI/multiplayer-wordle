// Game state
let gameState = {
    currentRow: 0,
    currentCol: 0,
    currentGuess: '',
    targetWord: '',
    gameOver: false,
    gameWon: false,
    hardMode: false,
    darkMode: false,
    highContrast: false,
    feedbackSounds: true,
    stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guessDistribution: [0, 0, 0, 0, 0, 0]
    }
};

// DOM elements
const gameBoard = document.getElementById('game-board');
const keyboard = document.getElementById('keyboard');
const helpModal = document.getElementById('help-modal');
const statsModal = document.getElementById('stats-modal');
const settingsModal = document.getElementById('settings-modal');
const toast = document.getElementById('toast');

// Initialize game
function initGame() {
    loadSettings();
    loadStats();
    createBoard();
    createKeyboard();
    setTargetWord();
    setupEventListeners();
    updateTheme();
}

// Create game board
function createBoard() {
    for (let row = 0; row < 6; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowDiv.id = `row-${row}`;
        
        for (let col = 0; col < 5; col++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${row}-${col}`;
            rowDiv.appendChild(tile);
        }
        
        gameBoard.appendChild(rowDiv);
    }
}

// Create keyboard
function createKeyboard() {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.addEventListener('click', () => handleKeyPress(key.dataset.key));
    });
}

// Set target word with random selection
function setTargetWord() {
    let lastWord = null;
    
    // Get last used word from localStorage to avoid repetition
    try {
        lastWord = localStorage.getItem('wordle-last-word');
    } catch (error) {
        console.warn('Failed to get last word from localStorage:', error);
    }
    
    let index;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    do {
        index = Math.floor(Math.random() * TARGET_WORDS.length);
        attempts++;
    } while (lastWord && TARGET_WORDS[index].toUpperCase() === lastWord.toUpperCase() && attempts < maxAttempts);
    
    gameState.targetWord = TARGET_WORDS[index].toUpperCase();
    
    // Save last word to localStorage
    try {
        localStorage.setItem('wordle-last-word', gameState.targetWord);
    } catch (error) {
        console.warn('Failed to save last word to localStorage:', error);
    }
}

// Handle key press
function handleKeyPress(key) {
    if (gameState.gameOver) return;

    if (key === 'enter') {
        submitGuess();
    } else if (key === 'backspace') {
        deleteLetter();
    } else if (key.match(/[a-z]/i) && gameState.currentCol < 5) {
        addLetter(key.toUpperCase());
    }
}

// Add letter to current guess
function addLetter(letter) {
    if (gameState.currentCol < 5) {
        const tile = document.getElementById(`tile-${gameState.currentRow}-${gameState.currentCol}`);
        tile.textContent = letter;
        tile.classList.add('filled');
        gameState.currentGuess += letter;
        gameState.currentCol++;
        
        if (gameState.feedbackSounds) {
            playSound('key');
        }
    }
}

// Delete letter from current guess
function deleteLetter() {
    if (gameState.currentCol > 0) {
        gameState.currentCol--;
        const tile = document.getElementById(`tile-${gameState.currentRow}-${gameState.currentCol}`);
        tile.textContent = '';
        tile.classList.remove('filled');
        gameState.currentGuess = gameState.currentGuess.slice(0, -1);
        
        if (gameState.feedbackSounds) {
            playSound('key');
        }
    }
}

// Submit guess
function submitGuess() {
    if (gameState.currentCol !== 5) {
        showToast('Not enough letters');
        return;
    }

    // Check if word is valid using the complete word list
    const allValidWords = new Set([...TARGET_WORDS, ...FINAL_VALID_GUESSES]);
    if (!allValidWords.has(gameState.currentGuess.toLowerCase())) {
        showToast('Not in word list');
        return;
    }

    if (gameState.hardMode && !isValidHardModeGuess()) {
        showToast('Hard mode: Must use revealed hints');
        return;
    }

    checkGuess();
}

// Check if guess is valid in hard mode
function isValidHardModeGuess() {
    const previousGuesses = [];
    for (let row = 0; row < gameState.currentRow; row++) {
        let guess = '';
        for (let col = 0; col < 5; col++) {
            guess += document.getElementById(`tile-${row}-${col}`).textContent;
        }
        previousGuesses.push(guess);
    }

    // Check if all revealed hints are used
    const targetLetters = gameState.targetWord.split('');
    const usedLetters = new Set();
    
    for (const prevGuess of previousGuesses) {
        for (let i = 0; i < 5; i++) {
            if (prevGuess[i] === gameState.targetWord[i]) {
                usedLetters.add(prevGuess[i]);
            }
        }
    }

    for (let i = 0; i < 5; i++) {
        if (gameState.targetWord[i] === gameState.currentGuess[i]) {
            usedLetters.delete(gameState.currentGuess[i]);
        }
    }

    return usedLetters.size === 0;
}

// Check the guess
function checkGuess() {
    const guess = gameState.currentGuess;
    const target = gameState.targetWord;
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

    // Animate tiles
    animateTiles(results);
    
    // Update keyboard
    updateKeyboard(guess, results);
    
    // Check win/lose
    if (guess === target) {
        gameState.gameWon = true;
        gameState.gameOver = true;
        gameState.stats.gamesWon++;
        gameState.stats.currentStreak++;
        gameState.stats.maxStreak = Math.max(gameState.stats.maxStreak, gameState.stats.currentStreak);
        gameState.stats.guessDistribution[gameState.currentRow]++;
        saveStats();
        setTimeout(() => {
            showToast('Genius!');
            showStats();
        }, 2000);
    } else if (gameState.currentRow === 5) {
        gameState.gameOver = true;
        gameState.stats.currentStreak = 0;
        saveStats();
        setTimeout(() => {
            showToast(gameState.targetWord);
            showStats();
        }, 2000);
    }

    gameState.currentRow++;
    gameState.currentCol = 0;
    gameState.currentGuess = '';
    gameState.stats.gamesPlayed++;
    saveStats();
}

// Animate tiles
function animateTiles(results) {
    for (let i = 0; i < 5; i++) {
        const tile = document.getElementById(`tile-${gameState.currentRow}-${i}`);
        setTimeout(() => {
            tile.classList.add('flip');
            setTimeout(() => {
                tile.classList.add(results[i]);
                tile.classList.remove('flip');
                if (gameState.feedbackSounds) {
                    playSound(results[i]);
                }
            }, 250);
        }, i * 100);
    }
}

// Update keyboard
function updateKeyboard(guess, results) {
    for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const key = document.querySelector(`[data-key="${letter.toLowerCase()}"]`);
        if (key) {
            if (results[i] === 'correct') {
                key.classList.add('correct');
                key.classList.remove('present', 'absent');
            } else if (results[i] === 'present' && !key.classList.contains('correct')) {
                key.classList.add('present');
                key.classList.remove('absent');
            } else if (results[i] === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
                key.classList.add('absent');
            }
        }
    }
}

// Show toast message
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Show stats
function showStats() {
    updateStatsDisplay();
    statsModal.style.display = 'block';
}

// Update stats display
function updateStatsDisplay() {
    document.getElementById('games-played').textContent = gameState.stats.gamesPlayed;
    document.getElementById('win-percentage').textContent = 
        gameState.stats.gamesPlayed > 0 ? 
        Math.round((gameState.stats.gamesWon / gameState.stats.gamesPlayed) * 100) : 0;
    document.getElementById('current-streak').textContent = gameState.stats.currentStreak;
    document.getElementById('max-streak').textContent = gameState.stats.maxStreak;

    for (let i = 0; i < 6; i++) {
        const bar = document.getElementById(`guess-${i + 1}`);
        bar.textContent = gameState.stats.guessDistribution[i];
        bar.style.width = `${Math.max(10, (gameState.stats.guessDistribution[i] / Math.max(...gameState.stats.guessDistribution)) * 100)}%`;
    }

    updateCountdown();
}

// Update countdown
function updateCountdown() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeLeft = tomorrow - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    document.getElementById('countdown').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleKeyPress('enter');
        } else if (e.key === 'Backspace') {
            handleKeyPress('backspace');
        } else if (e.key.match(/[a-z]/i)) {
            handleKeyPress(e.key.toLowerCase());
        }
    });

    // Modal events
    document.getElementById('help-btn').addEventListener('click', () => {
        helpModal.style.display = 'block';
    });

    document.getElementById('stats-btn').addEventListener('click', () => {
        showStats();
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    document.getElementById('new-game-btn').addEventListener('click', () => {
        startNewGame();
    });

    // Close modals
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Settings
    document.getElementById('hard-mode').addEventListener('change', (e) => {
        gameState.hardMode = e.target.checked;
        saveSettings();
    });

    document.getElementById('dark-mode').addEventListener('change', (e) => {
        gameState.darkMode = e.target.checked;
        updateTheme();
        saveSettings();
    });

    document.getElementById('high-contrast').addEventListener('change', (e) => {
        gameState.highContrast = e.target.checked;
        updateTheme();
        saveSettings();
    });

    document.getElementById('feedback-sounds').addEventListener('change', (e) => {
        gameState.feedbackSounds = e.target.checked;
        saveSettings();
    });
}

// Update theme
function updateTheme() {
    const root = document.documentElement;
    
    // Remove existing theme attributes
    document.body.removeAttribute('data-theme');
    
    // Apply themes in order of priority
    if (gameState.highContrast) {
        document.body.setAttribute('data-theme', 'high-contrast');
    } else if (gameState.darkMode) {
        document.body.setAttribute('data-theme', 'dark');
    }
}

// Play sound
function playSound(type) {
    if (!gameState.feedbackSounds) return;
    
    // Create audio context for generating sounds
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure sound based on type
    switch(type) {
        case 'key':
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.type = 'sine';
            break;
        case 'correct':
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.type = 'sine';
            break;
        case 'present':
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.type = 'sine';
            break;
        case 'absent':
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.type = 'sine';
            break;
    }
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Load settings
function loadSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('wordle-settings') || '{}');
        gameState.hardMode = settings.hardMode || false;
        gameState.darkMode = settings.darkMode || false;
        gameState.highContrast = settings.highContrast || false;
        gameState.feedbackSounds = settings.feedbackSounds !== false;

        document.getElementById('hard-mode').checked = gameState.hardMode;
        document.getElementById('dark-mode').checked = gameState.darkMode;
        document.getElementById('high-contrast').checked = gameState.highContrast;
        document.getElementById('feedback-sounds').checked = gameState.feedbackSounds;
    } catch (error) {
        console.warn('Failed to load settings from localStorage:', error);
        // Use default settings if localStorage fails
        gameState.hardMode = false;
        gameState.darkMode = false;
        gameState.highContrast = false;
        gameState.feedbackSounds = true;
    }
}

// Save settings
function saveSettings() {
    try {
        localStorage.setItem('wordle-settings', JSON.stringify({
            hardMode: gameState.hardMode,
            darkMode: gameState.darkMode,
            highContrast: gameState.highContrast,
            feedbackSounds: gameState.feedbackSounds
        }));
    } catch (error) {
        console.warn('Failed to save settings to localStorage:', error);
        showToast('Settings could not be saved');
    }
}

// Load stats
function loadStats() {
    try {
        const stats = JSON.parse(localStorage.getItem('wordle-stats') || '{}');
        gameState.stats = {
            gamesPlayed: stats.gamesPlayed || 0,
            gamesWon: stats.gamesWon || 0,
            currentStreak: stats.currentStreak || 0,
            maxStreak: stats.maxStreak || 0,
            guessDistribution: stats.guessDistribution || [0, 0, 0, 0, 0, 0]
        };
    } catch (error) {
        console.warn('Failed to load stats from localStorage:', error);
        // Use default stats if localStorage fails
        gameState.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            guessDistribution: [0, 0, 0, 0, 0, 0]
        };
    }
}

// Save stats
function saveStats() {
    try {
        localStorage.setItem('wordle-stats', JSON.stringify(gameState.stats));
    } catch (error) {
        console.warn('Failed to save stats to localStorage:', error);
        showToast('Stats could not be saved');
    }
}

// Start new game
function startNewGame() {
    // Clear the game board
    gameBoard.innerHTML = '';
    
    // Reset game state
    gameState.currentRow = 0;
    gameState.currentCol = 0;
    gameState.currentGuess = '';
    gameState.gameOver = false;
    gameState.gameWon = false;
    
    // Clear keyboard states
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('correct', 'present', 'absent');
    });
    
    // Create new board
    createBoard();
    
    // Set new target word with randomization to avoid repetition
    setTargetWord();
    
    // Show confirmation
    showToast('New game started!');
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);
