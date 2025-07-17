const fs = require('fs');
const path = require('path');

// Load words from words.js file
function loadWordLists() {
    try {
        const wordsContent = fs.readFileSync(path.join(__dirname, 'words.js'), 'utf8');
        
        // Extract TARGET_WORDS
        const targetMatch = wordsContent.match(/const TARGET_WORDS = \[(.*?)\];/s);
        let TARGET_WORDS = [];
        if (targetMatch) {
            const targetWordsStr = targetMatch[1];
            TARGET_WORDS = targetWordsStr.match(/"([a-z]{5})"/g)?.map(word => word.replace(/"/g, '').toUpperCase()) || [];
        }
        
        // Extract FINAL_VALID_GUESSES
        const validMatch = wordsContent.match(/const FINAL_VALID_GUESSES = \[(.*?)\];/s);
        let VALID_WORDS = [];
        if (validMatch) {
            const validWordsStr = validMatch[1];
            VALID_WORDS = validWordsStr.match(/"([a-z]{5})"/g)?.map(word => word.replace(/"/g, '').toUpperCase()) || [];
        }
        
        return { TARGET_WORDS, VALID_WORDS };
    } catch (error) {
        console.error('Error loading word lists:', error);
        return { TARGET_WORDS: [], VALID_WORDS: [] };
    }
}

// Test if a word would be accepted as a challenge word
function testChallengeWord(word, TARGET_WORDS, VALID_WORDS) {
    const upperWord = word.toUpperCase();
    
    // This mirrors the logic in server.js startChallenge method
    const allValidWords = new Set([...TARGET_WORDS, ...VALID_WORDS]);
    const isValid = allValidWords.has(upperWord);
    
    return {
        word: upperWord,
        isValid,
        inTargetWords: TARGET_WORDS.includes(upperWord),
        inValidWords: VALID_WORDS.includes(upperWord)
    };
}

// Get random sample from an array
function getRandomSample(array, sampleSize) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
}

// Main test function
function runChallengeWordTest() {
    console.log('🧪 Testing Challenge Word Acceptance...\n');
    
    const { TARGET_WORDS, VALID_WORDS } = loadWordLists();
    
    console.log(`📊 Loaded ${TARGET_WORDS.length} target words and ${VALID_WORDS.length} valid words`);
    
    // Test 50 random words from each category
    const targetSample = getRandomSample(TARGET_WORDS, 50);
    const validSample = getRandomSample(VALID_WORDS, 50);
    
    console.log('\n🎯 Testing 50 random TARGET_WORDS:');
    console.log('=' .repeat(50));
    
    let targetPassed = 0;
    let targetFailed = 0;
    
    targetSample.forEach((word, index) => {
        const result = testChallengeWord(word, TARGET_WORDS, VALID_WORDS);
        const status = result.isValid ? '✅ PASS' : '❌ FAIL';
        
        if (result.isValid) {
            targetPassed++;
        } else {
            targetFailed++;
        }
        
        if (index < 10 || !result.isValid) {
            const num = (index + 1).toString().padStart(2);
            console.log(`${num}. ${word} - ${status}`);
        }
    });
    
    console.log('\n🎮 Testing 50 random VALID_WORDS:');
    console.log('=' .repeat(50));
    
    let validPassed = 0;
    let validFailed = 0;
    
    validSample.forEach((word, index) => {
        const result = testChallengeWord(word, TARGET_WORDS, VALID_WORDS);
        const status = result.isValid ? '✅ PASS' : '❌ FAIL';
        
        if (result.isValid) {
            validPassed++;
        } else {
            validFailed++;
        }
        
        if (index < 10 || !result.isValid) {
            const num = (index + 1).toString().padStart(2);
            console.log(`${num}. ${word} - ${status}`);
        }
    });
    
    console.log('\n📈 TEST RESULTS:');
    console.log('=' .repeat(50));
    console.log(`TARGET_WORDS: ${targetPassed}/50 passed (${targetFailed} failed)`);
    console.log(`VALID_WORDS:  ${validPassed}/50 passed (${validFailed} failed)`);
    console.log(`TOTAL:        ${targetPassed + validPassed}/100 passed (${targetFailed + validFailed} failed)`);
    
    // Test some specific words that were problematic
    console.log('\n🔍 Testing Specific Known Words:');
    console.log('=' .repeat(50));
    
    const knownWords = ['CRANE', 'AUDIO', 'SLATE', 'HEART', 'HOUSE', 'WORDS', 'GAMES'];
    knownWords.forEach(word => {
        const result = testChallengeWord(word, TARGET_WORDS, VALID_WORDS);
        const status = result.isValid ? '✅ PASS' : '❌ FAIL';
        const source = result.inTargetWords ? 'TARGET' : result.inValidWords ? 'VALID' : 'NONE';
        console.log(`${word}: ${status} (Source: ${source})`);
    });
    
    // Summary
    const totalPassRate = ((targetPassed + validPassed) / 100 * 100).toFixed(1);
    console.log(`\n🎉 Overall Pass Rate: ${totalPassRate}%`);
    
    if (targetFailed > 0 || validFailed > 0) {
        console.log('\n⚠️  Some words failed! This indicates a potential issue with the challenge word validation.');
    } else {
        console.log('\n✅ All words passed! Challenge word validation is working correctly.');
    }
}

// Run the test
runChallengeWordTest();