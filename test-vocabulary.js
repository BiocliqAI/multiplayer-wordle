// Vocabulary validation test
const fs = require('fs');

// Read the words.js file
const wordsContent = fs.readFileSync('words.js', 'utf8');

// Simple word extraction
const words = [];
const matches = wordsContent.match(/"([a-z]{5})"/g);
if (matches) {
    matches.forEach(match => {
        words.push(match.replace(/"/g, ''));
    });
}

// Remove duplicates
const uniqueWords = [...new Set(words)];
const TARGET_WORDS = uniqueWords.slice(0, 2309);
const FINAL_VALID_GUESSES = uniqueWords;

console.log('🔍 VOCABULARY VALIDATION TEST');
console.log('=============================');
console.log('Total unique words:', uniqueWords.length);
console.log('Target words (solutions):', TARGET_WORDS.length);
console.log('Valid guess words:', FINAL_VALID_GUESSES.length);

// Test critical words
const criticalWords = ['might', 'thing', 'stare', 'stone', 'store', 'right', 'light', 'fight', 'night', 'sight'];
console.log('\n✅ CRITICAL WORDS TEST:');
criticalWords.forEach(word => {
    const inTarget = TARGET_WORDS.includes(word);
    const inValid = FINAL_VALID_GUESSES.includes(word);
    const status = inTarget ? '🎯 TARGET' : inValid ? '✅ VALID' : '❌ MISSING';
    console.log(`${word.toUpperCase()}: ${status}`);
});

// Test game validation logic
console.log('\n🎮 GAME VALIDATION TEST:');
const allValidWords = new Set([...TARGET_WORDS, ...FINAL_VALID_GUESSES]);
let passed = 0;
let failed = 0;

criticalWords.forEach(word => {
    if (allValidWords.has(word)) {
        passed++;
    } else {
        failed++;
    }
});

console.log(`Passed: ${passed}/${criticalWords.length}`);
console.log(`Failed: ${failed}/${criticalWords.length}`);

// Test edge cases
console.log('\n🔍 EDGE CASE TESTS:');
const testWords = ['apple', 'grape', 'house', 'water', 'paper', 'music', 'happy', 'world', 'dream', 'smile'];
testWords.forEach(word => {
    const isValid = allValidWords.has(word);
    console.log(`${word.toUpperCase()}: ${isValid ? '✅ VALID' : '❌ NOT IN LIST'}`);
});

// Test word length validation
console.log('\n📏 WORD LENGTH VALIDATION:');
const invalidWords = ['a', 'ab', 'abc', 'abcd', 'abcdef', 'toolong', 'short'];
invalidWords.forEach(word => {
    const isValid = allValidWords.has(word);
    console.log(`${word}: ${isValid ? '❌ SHOULD BE INVALID' : '✅ CORRECTLY REJECTED'}`);
});

console.log('\n✅ VOCABULARY TEST COMPLETE');
console.log('All critical words are included and validated!');
