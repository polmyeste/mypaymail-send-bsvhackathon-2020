import eff from './word-lists/eff';

// See : https://www.reddit.com/r/crypto/comments/4xe21s/
//
// skip is to make result in this range:
// 0 ≤ result < n* count < 2^31
// (where n is the largest integer that satisfies this equation)
// This makes result % count evenly distributed.
//
// P.S. if (((count - 1) & count) === 0) {...} is optional and for
// when count is a nice binary number (2n). If this if statement is
// removed then it might have to loop a few times. So it saves a
// couple of micro seconds.
function getRandomNumber(count) {
  const cryptoObj = window.crypto || window.msCrypto;
  const skip = 0x7fffffff - 0x7fffffff % count;

  let rand = new Uint32Array(1);

  if (((count - 1) & count) === 0) {
    cryptoObj.getRandomValues(rand);

    return rand[0] & (count - 1)
  }

  let result;

  do {
    cryptoObj.getRandomValues(rand);
    result = rand[0] & 0x7fffffff;
  } while (result >= skip);

  return result % count;
}

// Lookup a word by its wordNum and return
// an Array with a single word object suitable for displayWords.
function getWordFromWordNum (wordNum) {
  if (wordNum.length === 5) {
    let word = eff[wordNum];

    return word;
  }

  throw new Error('Unexpected number of words');
}

// Returns an array of objects of length numWords (default 1).
// Each object in the array represents a word and its index
// and is the result of numRollsPerWord die rolls (default 5).
function getRandomWords (numWords, numRollsPerWord) {
  if (!numWords) {
    numWords = 1
  }

  if (!numRollsPerWord) {
    numRollsPerWord = 5
  }

  let words = [];

  for (let i = 0; i < numWords; i += 1) {
    let rollResults = [];

    for (let j = 0; j < numRollsPerWord; j += 1) {
      // roll a 6 sided die
      rollResults.push(getRandomNumber(6) + 1);
    }

    const rollResultsJoined = rollResults.join('');

    words.push(getWordFromWordNum(rollResultsJoined));
  }

  return words;
}

const Random = {
  getRandomNumber,
  getRandomWords
}

export default Random;