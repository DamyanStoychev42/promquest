export const games = [
  {
    id: "poker",
    title: "Poker Table",
    subtitle: "Fake money, betting, community cards",
    themeClass: "theme-poker",
    rewardLabel: "Clue 1",
    clueText: "Обича да пие много чай,"
  },
  {
    id: "warships",
    title: "Warships",
    subtitle: "Place ships and attack turn by turn",
    themeClass: "theme-warships",
    rewardLabel: "Clue 2",
    clueText: "Бубата тормози с любов,"
  },
  {
    id: "quiz",
    title: "Us Quiz",
    subtitle: "Custom questions about you two",
    themeClass: "theme-quiz",
    rewardLabel: "Clue 3",
    clueText: "Гушките много харесва,"
  },
  {
    id: "geo",
    title: "BubaGuesser",
    subtitle: "Guess memory locations",
    themeClass: "theme-geo",
    rewardLabel: "Clue 4",
    clueText: "Въпрос голям го чака:"
  },
];

export const quizQuestions = [
  { question: "Кой е най-голямото бебе коте?", options: ["Ти", "Аз", "И двамата", "Рокси"], correct: 2 },
  { question: "Кой е първият ресторант, в който съм те завел?", options: ["Happy", "Made in Blue", "Skapto Burgers", "Китайката до даскало"], correct: 1 },
  { question: "Кой плод най-добре ме описва?", options: ["Ягодка", "Прасковка", "Портокалче", "Всички са верни"], correct: 3 },
  { question: "Колко процента от тялото ми е направено от твоите лиги?", options: ["10%", "50%", "68%", "70%"], correct: 2 },
  { question: "Какво си взимам в италиански ресторант, когато не знам какво ми се яде?", options: ["Салата Капрезе", "Карбонара", "Болонезе", "Бабини кюфтета в доматен сос и спанак"], correct: 1 },
];

export const revealClues = [
  "Обича да пие много чай,",
  "Бубата тормози с любов,",
  "Гушките много харесва,",
  "Въпрос голям го чака:",
];

export const finalRevealSentences = [
  "На Реденка внезапно ноември месец се запознахме...",
  "На 1-ви/5-ти декември станах най-щастливият човек на света.",
  "Любовта ми към теб вече 18 месеца експоненциално расте...",
  "Затова сега искам с нетърпение да ти задам въпроса:",
];

export const finalQuestion = "Ще бъдеш ли моята буба на Бала?";

export const geoLocations = [
  {
    title: "Mai Tais and Pina Coladas",
    question: "Where did we drink Mai Tais and Pina Coladas?",
    hint: "A sunny memory with cocktails.",
    lat: 40.3097778,
    lng: 23.9578611,
    thresholdMeters: 750,
    memoryText: "Cocktails, sun, and one of those moments I will always remember."
  },
  {
    title: "First date beginning",
    question: "Where did our first date begin?",
    hint: "The starting point of something very important.",
    lat: 42.6926667,
    lng: 23.3110556,
    thresholdMeters: 350,
    memoryText: "This is where our first date began."
  },
  {
    title: "The cult man moment",
    question: "Where did a crazy cult man tell us that God loves us, and then we saw him two more times the same day?",
    hint: "One of the most random and funny things that happened to us.",
    lat: 42.6791111,
    lng: 23.3179167,
    thresholdMeters: 350,
    memoryText: "Still one of the weirdest/funniest shared memories."
  },
  {
    title: "First attraction in Rome",
    question: "What was the first attraction we visited in Rome?",
    hint: "A classic Rome moment.",
    lat: 41.91425,
    lng: 12.4921944,
    thresholdMeters: 500,
    memoryText: "Our first attraction in Rome."
  },
  {
    title: "Book and temenujki",
    question: "Where did I give you a book and temenujki?",
    hint: "A small gift, but a very sweet memory.",
    lat: 42.663391723107644,
    lng: 23.31590904078257,
    thresholdMeters: 350,
    memoryText: "The place where I gave you a book and temenujki."
  },
];