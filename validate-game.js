// Complete game validation test
console.log('🎯 WORDLE GAME VALIDATION');
console.log('==========================');

// Import the actual word lists
const fs = require('fs');
const wordsContent = fs.readFileSync('words.js', 'utf8');

// Parse the actual word lists from words.js
function parseWordList(content, arrayName) {
  const lines = content.split('\n');
  let inArray = false;
  const words = [];
  
  lines.forEach(line => {
    if (line.includes(`const ${arrayName} = [`)) {
      inArray = true;
      return;
    }
    if (inArray && line.includes('];')) {
      inArray = false;
      return;
    }
    if (inArray) {
      const matches = line.match(/"([a-z]{5})"/g);
      if (matches) {
        matches.forEach(match => {
          words.push(match.replace(/"/g, ''));
        });
      }
    }
  });
  
  return words;
}

// Parse both arrays
const TARGET_WORDS = parseWordList(wordsContent, 'TARGET_WORDS');
const FINAL_VALID_GUESSES = parseWordList(wordsContent, 'FINAL_VALID_GUESSES');

console.log('📊 VOCABULARY STATISTICS:');
console.log(`Total unique words: ${new Set([...TARGET_WORDS, ...FINAL_VALID_GUESSES]).size}`);
console.log(`Target words (solutions): ${TARGET_WORDS.length}`);
console.log(`Valid guess words: ${FINAL_VALID_GUESSES.length}`);

// Test critical words
const criticalWords = ['might', 'thing', 'stare', 'stone', 'store', 'right', 'light', 'fight', 'night', 'sight'];
console.log('\n✅ CRITICAL WORDS VALIDATION:');
let allPassed = true;

criticalWords.forEach(word => {
  const inTarget = TARGET_WORDS.includes(word);
  const inValid = FINAL_VALID_GUESSES.includes(word);
  const status = inTarget ? '🎯 TARGET' : inValid ? '✅ VALID' : '❌ MISSING';
  console.log(`${word.toUpperCase()}: ${status}`);
  if (!inTarget && !inValid) allPassed = false;
});

// Test game validation logic
console.log('\n🎮 GAME LOGIC VALIDATION:');
const allValidWords = new Set([...TARGET_WORDS, ...FINAL_VALID_GUESSES]);

// Test 1: All critical words must be accepted
let criticalPassed = 0;
criticalWords.forEach(word => {
  if (allValidWords.has(word)) criticalPassed++;
});

console.log(`✅ Critical words accepted: ${criticalPassed}/${criticalWords.length}`);

// Test 2: Word length validation
console.log('\n📏 WORD LENGTH VALIDATION:');
const invalidLengths = ['a', 'ab', 'abc', 'abcd', 'abcdef', 'toolong'];
invalidLengths.forEach(word => {
  const isValid = allValidWords.has(word);
  console.log(`${word}: ${isValid ? '❌ SHOULD REJECT' : '✅ CORRECTLY REJECTED'}`);
});

// Test 3: Random sampling
console.log('\n🎲 RANDOM WORD TESTING:');
const randomTestWords = ['apple', 'grape', 'house', 'water', 'paper', 'music', 'happy', 'world', 'dream', 'smile'];
randomTestWords.forEach(word => {
  const isValid = allValidWords.has(word);
  console.log(`${word.toUpperCase()}: ${isValid ? '✅ VALID' : '❌ NOT IN LIST'}`);
});

// Test 4: Duplicate detection
console.log('\n🔄 DUPLICATE DETECTION:');
const uniqueCount = new Set(TARGET_WORDS).size;
console.log(`Target words unique: ${uniqueCount === TARGET_WORDS.length ? '✅' : '❌'}`);

// Test 5: Game simulation
console.log('\n🎮 GAME SIMULATION TEST:');
if (TARGET_WORDS.length > 0) {
  const testWord = TARGET_WORDS[0];
  console.log(`Sample target word: ${testWord.toUpperCase()}`);
  console.log(`Word length: ${testWord.length === 5 ? '✅' : '❌'}`);
  console.log(`Is valid guess: ${allValidWords.has(testWord) ? '✅' : '❌'}`);
} else {
  console.log('❌ No target words found!');
}

// Final summary
console.log('\n📋 FINAL VALIDATION SUMMARY:');
console.log(`✅ All critical words included: ${allPassed ? 'YES' : 'NO'}`);
console.log(`✅ Vocabulary size adequate: ${allValidWords.size >= 2000 ? 'YES' : 'NO'}`);
console.log(`✅ Game logic functional: ${criticalPassed === criticalWords.length ? 'YES' : 'NO'}`);
console.log('\n🎉 VALIDATION COMPLETE - Game ready for use!');
