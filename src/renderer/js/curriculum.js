// Sign It — lessons, quizzes and levels for ASL (English) and JSL (Japanese).
// Every lesson: Part 1 letters → Part 2 words → Part 3 a sentence.
// Words are either whole signs (LEXICON keys) or fingerspelled ('#WORD').

const W = (tok, en, ja) => ({ tok, en, ja });
const SEN = (toks, en, ja) => ({ toks, en, ja });

// ---------------------------------------------------------------------------
const ASL_LESSONS = [
  { title: ['First letters', 'はじめての文字'], letters: ['A', 'B', 'C'], words: [W('HELLO', 'hello', 'こんにちは'), W('YOU', 'you', 'あなた'), W('#CAB', 'cab (taxi)', 'タクシー')], sentence: SEN(['HELLO', 'YOU'], 'Hello to you!', 'こんにちは！') },
  { title: ['Your name', 'なまえ'], letters: ['D', 'E'], words: [W('MY', 'my', 'わたしの'), W('NAME', 'name', 'なまえ'), W('#BED', 'bed', 'ベッド')], sentence: SEN(['MY', 'NAME', '#DEB'], 'My name is Deb.', 'わたしのなまえはデブです。') },
  { title: ['Being polite', 'ていねいに'], letters: ['F', 'G'], words: [W('PLEASE', 'please', 'おねがい'), W('THANK_YOU', 'thank you', 'ありがとう'), W('#EGG', 'egg', 'たまご')], sentence: SEN(['#EGG', 'PLEASE'], 'An egg, please.', 'たまごをください。') },
  { title: ['Yes and no', 'はい・いいえ'], letters: ['H', 'I'], words: [W('YES', 'yes', 'はい'), W('NO', 'no', 'いいえ'), W('#HI', 'hi', 'やあ')], sentence: SEN(['YES', 'THANK_YOU'], 'Yes, thank you.', 'はい、ありがとう。') },
  { title: ['Family', 'かぞく'], letters: ['K', 'L'], words: [W('MOTHER', 'mother / mom', 'おかあさん'), W('FATHER', 'father / dad', 'おとうさん'), W('#LEG', 'leg', 'あし')], sentence: SEN(['HELLO', 'MOTHER'], 'Hello, Mom!', 'こんにちは、おかあさん！') },
  { title: ['Love and friends', 'あいとともだち'], letters: ['M', 'N'], words: [W('ME', 'I / me', 'わたし'), W('LOVE', 'love', 'あい'), W('FRIEND', 'friend', 'ともだち'), W('#MAN', 'man', 'おとこの人')], sentence: SEN(['ME', 'LOVE', 'MY', 'MOTHER'], 'I love my mom.', 'わたしはおかあさんがだいすき。') },
  { title: ['Food and drink', 'たべもの・のみもの'], letters: ['O', 'P'], words: [W('EAT', 'eat', 'たべる'), W('DRINK', 'drink', 'のむ'), W('#POP', 'pop (soda)', 'ジュース')], sentence: SEN(['ME', 'DRINK', '#POP'], 'I drink pop.', 'わたしはジュースをのむ。') },
  { title: ['More, please', 'もっと'], letters: ['R', 'S'], words: [W('MORE', 'more', 'もっと'), W('GOOD', 'good', 'いい'), W('#RED', 'red', 'あか')], sentence: SEN(['MORE', 'PLEASE'], 'More, please.', 'もっとください。') },
  { title: ['Feelings', 'きもち'], letters: ['T', 'U'], words: [W('HAPPY', 'happy', 'うれしい'), W('SORRY', 'sorry', 'ごめんなさい'), W('#CAT', 'cat', 'ねこ'), W('#SUN', 'sun', 'たいよう')], sentence: SEN(['ME', 'HAPPY'], 'I am happy.', 'わたしはうれしい。') },
  { title: ['Water and play', 'みずとあそび'], letters: ['V', 'W', 'X'], words: [W('WATER', 'water', 'みず'), W('PLAY', 'play', 'あそぶ'), W('#BOX', 'box', 'はこ')], sentence: SEN(['ME', 'DRINK', 'WATER'], 'I drink water.', 'わたしはみずをのむ。') },
  { title: ['Questions', 'しつもん'], letters: ['Y'], words: [W('WHAT', 'what', 'なに'), W('YOUR', 'your', 'あなたの'), W('#YES', 'yes (spelled)', 'イエス')], sentence: SEN(['YOUR', 'NAME', 'WHAT'], 'What is your name?', 'あなたのなまえはなに？') },
  { title: ['Letters that move', 'うごく文字'], letters: ['J', 'Z'], words: [W('LIKE', 'like', 'すき'), W('HELP', 'help', 'たすける'), W('#JAM', 'jam', 'ジャム'), W('#ZOO', 'zoo', 'どうぶつえん')], sentence: SEN(['ME', 'LIKE', '#JAM'], 'I like jam.', 'わたしはジャムがすき。') },
  { title: ['See you!', 'またね！'], letters: ['Q'], words: [W('SEE', 'see', 'みる'), W('BOOK', 'book', 'ほん'), W('#QUIZ', 'quiz', 'クイズ')], sentence: SEN(['SEE', 'YOU'], 'See you!', 'またね！') },
  { title: ['Vowels review', '母音のふくしゅう'], letters: ['A', 'E', 'I', 'O', 'U'], words: [W('SCHOOL', 'school', 'がっこう'), W('FINE', 'fine', 'げんき')], sentence: SEN(['ME', 'FINE'], 'I am fine.', 'わたしはげんきです。') },
  { title: ['Look-alike fists', 'にているグー'], letters: ['A', 'S', 'T', 'M', 'N', 'E'], words: [W('HOME', 'home', 'いえ'), W('WHERE', 'where', 'どこ')], sentence: SEN(['HOME', 'WHERE'], 'Where is home?', 'いえはどこ？') },
  { title: ['Two-finger letters', '2本指の文字'], letters: ['U', 'V', 'R', 'K'], words: [W('WANT', 'want', 'ほしい'), W('#VAN', 'van', 'バン')], sentence: SEN(['ME', 'WANT', 'WATER'], 'I want water.', 'わたしはみずがほしい。') },
  { title: ['Pointing letters', 'さす文字'], letters: ['G', 'H', 'P', 'Q'], words: [W('FAMILY', 'family', 'かぞく'), W('#PIG', 'pig', 'ぶた')], sentence: SEN(['ME', 'LOVE', 'FAMILY'], 'I love my family.', 'わたしはかぞくがだいすき。') },
  { title: ['Round letters', 'まるい文字'], letters: ['D', 'F', 'O', 'C', 'X'], words: [W('BABY', 'baby', 'あかちゃん'), W('#FOX', 'fox', 'きつね')], sentence: SEN(['BABY', 'HAPPY'], 'The baby is happy.', 'あかちゃんはうれしい。') },
  { title: ['Pinky letters', '小指の文字'], letters: ['I', 'J', 'Y', 'L'], words: [W('ILY', 'I love you', 'あいしてる'), W('GOODBYE', 'goodbye', 'さようなら')], sentence: SEN(['ILY', 'GOODBYE'], 'I love you, goodbye!', 'だいすき、またね！') },
  { title: ['Putting it together', 'まとめ'], letters: ['W', 'B', 'Z'], words: [W('NAME', 'name', 'なまえ'), W('#SAM', 'Sam', 'サム')], sentence: SEN(['HELLO', 'MY', 'NAME', '#SAM'], 'Hello, my name is Sam.', 'こんにちは、わたしのなまえはサムです。') }
];

const JSL_LESSONS = [
  { title: ['Hello', 'はじめての指文字'], letters: ['あ', 'い', 'う'], words: [W('こんにちは', 'hello', 'こんにちは'), W('あなた', 'you', 'あなた'), W('#あい', 'love', 'あい')], sentence: SEN(['こんにちは', 'あなた'], 'Hello to you!', 'こんにちは！') },
  { title: ['Your name', 'なまえ'], letters: ['え', 'お'], words: [W('わたし', 'I / me', 'わたし'), W('なまえ', 'name', 'なまえ'), W('#いえ', 'house', 'いえ')], sentence: SEN(['わたし', 'なまえ', '#あお'], 'My name is Ao.', 'わたしのなまえはあおです。') },
  { title: ['Thank you', 'ありがとう'], letters: ['か', 'き'], words: [W('ありがとう', 'thank you', 'ありがとう'), W('#かお', 'face', 'かお'), W('#えき', 'station', 'えき')], sentence: SEN(['#かき', 'ありがとう'], 'A persimmon? Thank you!', 'かき、ありがとう！') },
  { title: ['No, thanks', 'いいえ'], letters: ['く', 'け'], words: [W('いいえ', 'no', 'いいえ'), W('#きく', 'chrysanthemum', 'きく'), W('#いけ', 'pond', 'いけ')], sentence: SEN(['いいえ', 'ありがとう'], 'No, thank you.', 'いいえ、ありがとう。') },
  { title: ['Family', 'かぞく'], letters: ['さ', 'し'], words: [W('おかあさん', 'mother', 'おかあさん'), W('おとうさん', 'father', 'おとうさん'), W('#かさ', 'umbrella', 'かさ'), W('#うし', 'cow', 'うし')], sentence: SEN(['こんにちは', 'おかあさん'], 'Hello, Mom!', 'こんにちは、おかあさん！') },
  { title: ['Friends', 'ともだち'], letters: ['た'], words: [W('すき', 'like', 'すき'), W('ともだち', 'friend', 'ともだち'), W('#たき', 'waterfall', 'たき')], sentence: SEN(['わたし', 'ともだち', 'すき'], 'I like my friend.', 'わたしはともだちがすき。') },
  { title: ['Eating', 'たべる'], letters: ['に'], words: [W('たべる', 'eat', 'たべる'), W('のむ', 'drink', 'のむ'), W('#かに', 'crab', 'かに')], sentence: SEN(['わたし', '#かに', 'たべる'], 'I eat crab.', 'わたしはかにをたべる。') },
  { title: ['Delicious', 'おいしい'], letters: ['ま'], words: [W('おいしい', 'delicious', 'おいしい'), W('#くま', 'bear', 'くま'), W('#まめ', 'beans', 'まめ')], sentence: SEN(['#まめ', 'おいしい'], 'The beans are delicious.', 'まめはおいしい。') },
  { title: ['Playing', 'あそぶ'], letters: ['み'], words: [W('あそぶ', 'play', 'あそぶ'), W('#うみ', 'sea', 'うみ')], sentence: SEN(['#うみ', 'あそぶ'], 'Let\'s play at the sea.', 'うみであそぶ。') },
  { title: ['I\'m OK', 'だいじょうぶ'], letters: ['む', 'め'], words: [W('だいじょうぶ', 'OK / all right', 'だいじょうぶ'), W('#むし', 'bug', 'むし'), W('#あめ', 'rain / candy', 'あめ')], sentence: SEN(['わたし', 'だいじょうぶ'], 'I\'m OK.', 'わたしはだいじょうぶ。') },
  { title: ['Sorry', 'ごめんなさい'], letters: ['や'], words: [W('ごめんなさい', 'I\'m sorry', 'ごめんなさい'), W('#やま', 'mountain', 'やま'), W('#やさい', 'vegetables', 'やさい')], sentence: SEN(['#やさい', 'おいしい'], 'Vegetables are delicious.', 'やさいはおいしい。') },
  { title: ['Good morning', 'おはよう'], letters: ['よ'], words: [W('おはよう', 'good morning', 'おはよう'), W('#よい', 'good', 'よい')], sentence: SEN(['おはよう', 'おかあさん'], 'Good morning, Mom!', 'おはよう、おかあさん！') },
  { title: ['Nice to meet you', 'よろしく'], letters: ['ら'], words: [W('よろしく', 'nice to meet you', 'よろしく'), W('#さくら', 'cherry blossom', 'さくら')], sentence: SEN(['わたし', '#さくら', 'すき'], 'I like cherry blossoms.', 'わたしはさくらがすき。') },
  { title: ['History', 'れきし'], letters: ['れ'], words: [W('#れきし', 'history', 'れきし'), W('#かれい', 'flounder (fish)', 'かれい')], sentence: SEN(['わたし', '#れきし', 'すき'], 'I like history.', 'わたしはれきしがすき。') },
  { title: ['River', 'かわ'], letters: ['わ'], words: [W('#わたし', 'I (spelled)', 'わたし（指文字）'), W('#かわ', 'river', 'かわ')], sentence: SEN(['#かわ', 'あそぶ'], 'Let\'s play at the river.', 'かわであそぶ。') },
  { title: ['Vowels review', '母音のふくしゅう'], letters: ['あ', 'い', 'う', 'え', 'お'], words: [W('なに', 'what', 'なに')], sentence: SEN(['あなた', 'なまえ', 'なに'], 'What is your name?', 'あなたのなまえはなに？') },
  { title: ['Fist shapes', 'グーの形'], letters: ['さ', 'た', 'あ', 'え'], words: [W('#さしみ', 'sashimi', 'さしみ')], sentence: SEN(['#さしみ', 'おいしい'], 'Sashimi is delicious.', 'さしみはおいしい。') },
  { title: ['Number shapes', '数字の形'], letters: ['に', 'み', 'よ', 'む', 'し', 'く'], words: [W('#にく', 'meat', 'にく')], sentence: SEN(['#にく', 'たべる'], 'Eat meat.', 'にくをたべる。') },
  { title: ['Look-alikes', 'にている形'], letters: ['か', 'ら', 'う', 'き', 'め'], words: [W('よろしく', 'nice to meet you', 'よろしく')], sentence: SEN(['わたし', 'なまえ', '#あい', 'よろしく'], 'My name is Ai. Nice to meet you.', 'わたしのなまえはあいです。よろしく。') },
  { title: ['Putting it together', 'まとめ'], letters: ['け', 'れ', 'わ', 'や', 'ま'], words: [W('こんにちは', 'hello', 'こんにちは')], sentence: SEN(['こんにちは', 'わたし', 'なまえ', '#さくら'], 'Hello, my name is Sakura.', 'こんにちは、わたしのなまえはさくらです。') }
];

export function lessons(lang) { return lang === 'ja' ? JSL_LESSONS : ASL_LESSONS; }

// ---------------------------------------------------------------------------
// Levels: 1–5 handshapes, 6–10 written words, 11–15 spoken words, 16–20 sentences.
const ASL_LEVELS = [
  ['A', 'E', 'I', 'O', 'U'], ['B', 'C', 'D', 'L', 'Y'], ['F', 'K', 'R', 'V', 'W'], ['G', 'H', 'S', 'T', 'X'], ['M', 'N', 'P', 'Q', 'J', 'Z'],
  ['CAT', 'HI', 'BED'], ['MOM', 'DAD', 'EGG'], ['SUN', 'BOX', 'FISH'], ['LOVE', 'PLAY', 'HELP'], ['HAPPY', 'WATER', 'ZOO'],
  ['RED', 'DOG', 'YES'], ['CAKE', 'MILK', 'BOOK'], ['BLUE', 'TREE', 'BIRD'], ['FROG', 'JUMP', 'QUIZ'], ['SMILE', 'FRIEND', 'SCHOOL'],
  ['HI MOM', 'I LOVE YOU'], ['I AM OK', 'SEE YOU'], ['MY DOG', 'GOOD JOB'], ['I LIKE CAKE', 'HELLO FRIEND'], ['THANK YOU', 'WE CAN PLAY']
];
const JSL_LEVELS = [
  ['あ', 'い', 'う', 'え', 'お'], ['か', 'き', 'く', 'け', 'さ'], ['し', 'に', 'み', 'よ', 'む'], ['た', 'ま', 'め', 'や', 'わ'], ['ら', 'れ', 'か', 'け', 'き'],
  ['あい', 'いえ', 'かお'], ['かさ', 'うし', 'えき'], ['くま', 'まめ', 'うみ'], ['やま', 'かめ', 'あめ'], ['さくら', 'わたし', 'やさい'],
  ['いか', 'あさ', 'あき'], ['かに', 'にく', 'むし'], ['たけ', 'たき', 'しか'], ['かみ', 'くさ', 'かわ'], ['おかし', 'さしみ', 'あたま'],
  ['あおい うみ', 'たかい やま'], ['あかい かさ', 'あまい おかし'], ['あたらしい いえ', 'わかい しか'], ['おおきい くま', 'さくら きれい'], ['あかい かに', 'わたし さくら']
];
const MEANINGS = {
  CAT: 'ねこ', HI: 'やあ', BED: 'ベッド', MOM: 'ママ', DAD: 'パパ', EGG: 'たまご', SUN: 'たいよう', BOX: 'はこ', FISH: 'さかな', LOVE: 'あい', PLAY: 'あそぶ', HELP: 'たすける',
  HAPPY: 'うれしい', WATER: 'みず', ZOO: 'どうぶつえん', RED: 'あか', DOG: 'いぬ', YES: 'はい', CAKE: 'ケーキ', MILK: 'ぎゅうにゅう', BOOK: 'ほん', BLUE: 'あお', TREE: 'き', BIRD: 'とり',
  FROG: 'かえる', JUMP: 'ジャンプ', QUIZ: 'クイズ', SMILE: 'えがお', FRIEND: 'ともだち', SCHOOL: 'がっこう',
  'あい': 'love', 'いえ': 'house', 'かお': 'face', 'かさ': 'umbrella', 'うし': 'cow', 'えき': 'station', 'くま': 'bear', 'まめ': 'beans', 'うみ': 'sea', 'やま': 'mountain', 'かめ': 'turtle', 'あめ': 'rain',
  'さくら': 'cherry blossom', 'わたし': 'I / me', 'やさい': 'vegetables', 'いか': 'squid', 'あさ': 'morning', 'あき': 'autumn', 'かに': 'crab', 'にく': 'meat', 'むし': 'bug', 'たけ': 'bamboo', 'たき': 'waterfall',
  'しか': 'deer', 'かみ': 'paper', 'くさ': 'grass', 'かわ': 'river', 'おかし': 'sweets', 'さしみ': 'sashimi', 'あたま': 'head',
  'HI MOM': 'ママ、やあ', 'I LOVE YOU': 'あいしてる', 'I AM OK': 'だいじょうぶ', 'SEE YOU': 'またね', 'MY DOG': 'わたしのいぬ', 'GOOD JOB': 'よくできました', 'I LIKE CAKE': 'ケーキがすき', 'HELLO FRIEND': 'こんにちは、ともだち', 'THANK YOU': 'ありがとう', 'WE CAN PLAY': 'いっしょにあそべる',
  'あおい うみ': 'blue sea', 'たかい やま': 'tall mountain', 'あかい かさ': 'red umbrella', 'あまい おかし': 'sweet candy', 'あたらしい いえ': 'new house', 'わかい しか': 'young deer', 'おおきい くま': 'big bear', 'さくら きれい': 'the cherry blossoms are pretty', 'あかい かに': 'red crab', 'わたし さくら': 'I am Sakura'
};

/**
 * Returns the level definition:
 * { n, type: 1..4, items: [{ text, meaning, words: [[keys...], ...] }] }
 * `words` is the target sequence of handshape keys, grouped per word.
 */
export function level(lang, n) {
  const src = (lang === 'ja' ? JSL_LEVELS : ASL_LEVELS)[n - 1];
  const type = n <= 5 ? 1 : n <= 10 ? 2 : n <= 15 ? 3 : 4;
  const items = type === 1
    ? src.map((k) => ({ text: k, meaning: '', words: [[k]] }))
    : src.map((text) => ({
      text,
      meaning: MEANINGS[text] || '',
      words: text === 'I LOVE YOU' ? [['ILY']] : text.split(' ').map((w) => Array.from(w))
    }));
  return { n, type, items };
}

export const QUIZZES = {
  mid: { afterLesson: 10, lessonsFrom: 1, lessonsTo: 10, count: 10 },
  final: { afterLesson: 20, lessonsFrom: 1, lessonsTo: 20, count: 15 }
};
export const PASS_PCT = 70;
