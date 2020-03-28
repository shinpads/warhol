function generateWords(amount) {
  const indexes = [];
  while (indexes.length < amount) {
    const n = Math.floor(Math.random() * words.length) + 1;
    if (indexes.indexOf(n === -1)) {
      indexes.push(n);
    }
  }
  return indexes.map(i => words[i]);
}


const words = [
  'insect',
  'queen',
  'sister',
  'piano',
  'classroom',
  'girlfriend',
  'airport',
  'apartment',
  'medicine',
  'space',
  'movie',
  'Donald Trump',
  'juggle',
  'sniper',
  'death',
  'fishing',
  'war',
  'punching',
  'boxing match',
  'philosophy',
  'lecture',
  'George Washington',
  'exam',
  'van',
  'army',
  'Chinese',
  'leader',
  'president',
  'language',
  'race car',
  'pole jump',
  'sky diving',
  'funeral',
  'wedding',
  'art',
  'magazine',
  'black hole',
  'highway',
  'professor',
  'virus',
  'stranger',
  'winner',
  'director',
  'billionare',
  'surgery',
  'chemistry',
  'king',
  'sword fight',
  'internet',
  'sex party',
  'dad',
  'construction',
  'traffic',
  'fortune',
  'groceries',
  'police',
  'bank robber',
  'snowstorm',
  'proposal',
  'poem',
  'Confucius',
  'injury',
  'singer',
  'Jungle',
  
];

module.exports = {
  generateWords,
};
