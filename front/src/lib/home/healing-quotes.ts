export interface HealingQuote {
  id: string;
  quote: string;
  author: string;
  originalQuote: string;
  sourceTitle: string;
  sourceUrl: string;
}

const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const KST_OFFSET_IN_MS = 9 * ONE_HOUR_IN_MS;

export const HEALING_QUOTES: HealingQuote[] = [
  {
    id: "alcott-sail-my-ship",
    quote:
      "폭풍이 두렵지 않다.\n나는 내 배를 모는 법을\n배우는 중이니까.",
    author: "Louisa May Alcott",
    originalQuote:
      "I'm not afraid of storms, for I'm learning how to sail my ship.",
    sourceTitle: "Little Women, Chapter 44: My Lord and Lady",
    sourceUrl: "https://en.wikiquote.org/wiki/Louisa_May_Alcott",
  },
  {
    id: "stevenson-duty-of-being-happy",
    quote:
      "행복해지는 일만큼\n우리가 대수롭지 않게 여기는\n의무는 없다.",
    author: "Robert Louis Stevenson",
    originalQuote:
      "There is no duty we so much underrate as the duty of being happy.",
    sourceTitle: "An Apology for Idlers",
    sourceUrl:
      "https://en.wikisource.org/wiki/Virginibus_Puerisque_and_Other_Papers/An_Apology_for_Idlers",
  },
  {
    id: "stevenson-travel-hopefully",
    quote:
      "희망을 품고 길을 가는 일은\n어딘가에 도착하는 일보다\n더 값질 때가 있다.",
    author: "Robert Louis Stevenson",
    originalQuote: "To travel hopefully is a better thing than to arrive.",
    sourceTitle: "El Dorado",
    sourceUrl:
      "https://en.wikisource.org/wiki/Virginibus_Puerisque_and_Other_Papers/El_Dorado",
  },
  {
    id: "stevenson-happy-as-kings",
    quote:
      "세상에는 좋은 것들이\n참 많이 있어서,\n우리 모두 왕처럼\n행복해져야 한다.",
    author: "Robert Louis Stevenson",
    originalQuote:
      "The world is so full of a number of things, I'm sure we should all be as happy as kings.",
    sourceTitle: "A Child's Garden of Verses, Happy Thought",
    sourceUrl:
      "https://en.wikisource.org/wiki/A_Child%27s_Garden_of_Verses/Happy_Thought",
  },
  {
    id: "dickinson-hope-feathers",
    quote:
      "희망은 영혼에 내려앉아\n말 없는 노래를 부르며\n조금도 멈추지 않는\n깃털 달린 존재다.",
    author: "Emily Dickinson",
    originalQuote:
      "\"Hope\" is the thing with feathers – That perches in the soul – And sings the tune without the words – And never stops – at all –",
    sourceTitle: "\"Hope\" is the thing with feathers",
    sourceUrl: "https://www.poetryfoundation.org/poems/42889/hope-is-the-thing-with-feathers-314",
  },
  {
    id: "thoreau-direction-of-dreams",
    quote:
      "누군가 자신의 꿈이 향하는 쪽으로\n자신 있게 나아가고,\n마음속에 그린 삶을 살려 한다면\n뜻밖의 결실을 만나게 된다.",
    author: "Henry David Thoreau",
    originalQuote:
      "I learned this, at least, by my experiment: that if one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.",
    sourceTitle: "Walden",
    sourceUrl: "https://en.wikiquote.org/wiki/Walden",
  },
  {
    id: "emerson-best-day",
    quote:
      "마음에 새겨라.\n매일이 일 년 중\n가장 좋은 날이라고.",
    author: "Ralph Waldo Emerson",
    originalQuote:
      "Write it on your heart that every day is the best day in the year.",
    sourceTitle: "Society and Solitude, Work and Days",
    sourceUrl: "https://www.gutenberg.org/ebooks/69258.html.images",
  },
  {
    id: "keller-optimism",
    quote:
      "낙관은 우리를\n성취로 이끄는 믿음이다.\n희망 없이는\n아무 일도 이룰 수 없다.",
    author: "Helen Keller",
    originalQuote:
      "Optimism is the faith that leads to achievement; nothing can be done without hope.",
    sourceTitle: "Optimism",
    sourceUrl: "https://en.wikisource.org/wiki/Optimism_(Keller)",
  },
  {
    id: "dickens-lightens-burden",
    quote:
      "다른 사람의 짐을\n조금이라도 덜어 주는 사람은\n이 세상에서\n결코 쓸모없는 존재가 아니다.",
    author: "Charles Dickens",
    originalQuote:
      "No one is useless in this world who lightens the burden of it for any one else.",
    sourceTitle: "Our Mutual Friend, Book III, Chapter 9",
    sourceUrl: "https://en.wikiquote.org/wiki/Charles_Dickens",
  },
  {
    id: "james-act-as-if",
    quote:
      "당신이 하는 일이\n변화를 만든다고 믿고\n행동하라.\n실제로 그렇다.",
    author: "William James",
    originalQuote: "Act as if what you do makes a difference. It does.",
    sourceTitle: "Correspondence with Helen Keller (1908)",
    sourceUrl: "https://en.wikiquote.org/wiki/William_James",
  },
  {
    id: "james-life-worth-living",
    quote:
      "삶을 두려워하지 말라.\n삶은 살아볼 가치가 있다고 믿어라.\n그 믿음이\n그 사실을 만들어 준다.",
    author: "William James",
    originalQuote:
      "Be not afraid of life. Believe that life is worth living, and your belief will help create the fact.",
    sourceTitle: "Is Life Worth Living?",
    sourceUrl: "https://en.wikiquote.org/wiki/William_James",
  },
  {
    id: "aurelius-universe-change",
    quote:
      "세상은 늘 변하고,\n우리의 삶은\n우리가 어떤 생각을 품느냐에 따라\n달라진다.",
    author: "Marcus Aurelius",
    originalQuote:
      "The universe is change; our life is what our thoughts make it.",
    sourceTitle: "Meditations, IV, 3",
    sourceUrl: "https://en.wikiquote.org/wiki/Marcus_Aurelius_Antoninus",
  },
  {
    id: "aurelius-retire-into-yourself",
    quote:
      "사람들은 쉼터를 찾지만\n가장 고요한 피난처는\n자기 자신의 영혼 안에 있다.",
    author: "Marcus Aurelius",
    originalQuote:
      "Nowhere can man find a quieter or more untroubled retreat than in his own soul.",
    sourceTitle: "Meditations, IV, 3",
    sourceUrl: "https://en.wikiquote.org/wiki/Marcus_Aurelius_Antoninus",
  },
  {
    id: "seneca-begin-to-live",
    quote:
      "지금 바로 살아가기 시작하라.\n하루하루를\n하나의 삶처럼\n받아들여라.",
    author: "Seneca",
    originalQuote:
      "Therefore, my dear Lucilius, begin at once to live, and count each separate day as a separate life.",
    sourceTitle: "Letter CI: On the Futility of Planning Ahead",
    sourceUrl: "https://en.wikiquote.org/wiki/Lucius_Annaeus_Seneca",
  },
  {
    id: "dickens-present-blessings",
    quote:
      "지나간 불행보다\n지금 내 곁의 축복을 바라보라.\n누구에게나 불행은 있고,\n축복도 있다.",
    author: "Charles Dickens",
    originalQuote:
      "Reflect upon your present blessings — of which every man has many — not on your past misfortunes, of which all men have some.",
    sourceTitle: "A Christmas Carol",
    sourceUrl: "https://en.wikiquote.org/wiki/Charles_Dickens",
  },
  {
    id: "keller-overcoming-suffering",
    quote:
      "세상은 고통으로 가득하지만\n그 고통을 이겨 내는 힘으로도\n가득 차 있다.",
    author: "Helen Keller",
    originalQuote:
      "Although the world is full of suffering, it is full also of the overcoming of it.",
    sourceTitle: "Optimism",
    sourceUrl: "https://en.wikiquote.org/wiki/Helen_Keller",
  },
  {
    id: "keats-thing-of-beauty",
    quote:
      "아름다운 것은\n언제나 기쁨이 된다.\n그 아름다움은\n쉽게 사라지지 않는다.",
    author: "John Keats",
    originalQuote:
      "A thing of beauty is a joy forever: Its loveliness increases; it will never Pass into nothingness.",
    sourceTitle: "Endymion, Book I, line 1",
    sourceUrl: "https://en.wikiquote.org/wiki/John_Keats",
  },
  {
    id: "keats-shape-of-beauty",
    quote:
      "어떤 아름다움은\n우리 마음의 어둠을\n조금씩 걷어낸다.",
    author: "John Keats",
    originalQuote:
      "In spite of all, Some shape of beauty moves away the pall From our dark spirits.",
    sourceTitle: "Endymion, Book I, line 11",
    sourceUrl: "https://en.wikiquote.org/wiki/John_Keats",
  },
  {
    id: "austen-tenderness-of-heart",
    quote:
      "다정한 마음만큼\n깊은 매력을 가진 것은 없다.",
    author: "Jane Austen",
    originalQuote: "There is no charm equal to tenderness of heart.",
    sourceTitle: "Emma, Chapter 13",
    sourceUrl: "https://en.wikiquote.org/wiki/Emma_(novel)",
  },
  {
    id: "thoreau-day-dawns",
    quote:
      "우리가 깨어 있는 날만이\n비로소 밝아온다.\n아직 밝혀질 날은 더 많다.",
    author: "Henry David Thoreau",
    originalQuote:
      "Only that day dawns to which we are awake. There is more day to dawn. The sun is but a morning star.",
    sourceTitle: "Walden",
    sourceUrl: "https://en.wikiquote.org/wiki/Henry_David_Thoreau",
  },
  {
    id: "wordsworth-kindness-and-love",
    quote:
      "한 사람의 삶에서\n가장 좋은 부분은\n이름 없이 남겨 둔\n작은 친절과 사랑이다.",
    author: "William Wordsworth",
    originalQuote:
      "That best portion of a good man's life, His little, nameless, unremembered acts Of kindness and of love.",
    sourceTitle: "Lines Composed a Few Miles above Tintern Abbey",
    sourceUrl: "https://en.wikiquote.org/wiki/William_Wordsworth",
  },
  {
    id: "nightingale-practical-beginning",
    quote:
      "아무리 작아도\n실질적인 시작을 미루지 말라.\n작은 시작이\n깊게 뿌리내릴 때가 많다.",
    author: "Florence Nightingale",
    originalQuote:
      "I never lose an opportunity of urging a practical beginning, however small, for it is wonderful how often in such matters the mustard-seed germinates and roots itself.",
    sourceTitle: "Letter to a friend",
    sourceUrl: "https://en.wikiquote.org/wiki/Florence_Nightingale",
  },
  {
    id: "barrie-bring-sunshine",
    quote:
      "다른 사람의 삶에\n햇살을 들이는 사람은\n그 햇살을\n자기에게서도 잃지 않는다.",
    author: "J. M. Barrie",
    originalQuote:
      "Those who bring sunshine into the lives of others cannot keep it from themselves.",
    sourceTitle: "As quoted in Christ's Second Coming Fulfilled (1917)",
    sourceUrl: "https://en.wikiquote.org/wiki/J._M._Barrie",
  },
  {
    id: "allen-calmness-of-mind",
    quote:
      "마음의 평온은\n지혜의 아름다운 보석이다.\n오랜 자기 수양 끝에\n얻어지는 결실이다.",
    author: "James Allen",
    originalQuote:
      "Calmness of mind is one of the beautiful jewels of wisdom. It is the result of long and patient effort in self-control.",
    sourceTitle: "Serenity",
    sourceUrl: "https://en.wikiquote.org/wiki/James_Allen",
  },
  {
    id: "browning-reach-and-grasp",
    quote:
      "사람의 손은\n붙잡은 것보다\n조금 더 먼 곳을\n향해야 한다.",
    author: "Robert Browning",
    originalQuote:
      "Ah, but a man's reach should exceed his grasp, Or what's a heaven for?",
    sourceTitle: "Andrea Del Sarto",
    sourceUrl: "https://en.wikiquote.org/wiki/Effort",
  },
  {
    id: "stowe-the-tide-will-turn",
    quote:
      "모든 것이 거슬러\n더는 버틸 수 없을 것 같을 때,\n바로 그때가\n물결이 바뀌는 순간일 수 있다.",
    author: "Harriet Beecher Stowe",
    originalQuote:
      "When you get into a tight place, and everything goes against you till it seems as if you couldn't hold on a minute longer, never give up then, for that's just the place and time that the tide 'll turn.",
    sourceTitle: "Old Town Folks, Chapter 39",
    sourceUrl: "https://en.wikiquote.org/wiki/Harriet_Beecher_Stowe",
  },
  {
    id: "tolstoy-live-for-others",
    quote:
      "오래가는 행복은\n다른 사람을 위해\n사는 데 있다.",
    author: "Leo Tolstoy",
    originalQuote:
      "There is only one enduring happiness in life—to live for others.",
    sourceTitle: "Family Happiness, Part 1, Chapter 2",
    sourceUrl: "https://en.wikiquote.org/wiki/Leo_Tolstoy",
  },
  {
    id: "tolstoy-seize-happiness",
    quote:
      "행복한 순간을 붙잡고,\n사랑하고,\n사랑받아라.\n그것이 삶의 가장 또렷한 현실이다.",
    author: "Leo Tolstoy",
    originalQuote:
      "Seize the moments of happiness, love and be loved! That is the only reality in the world, all else is folly.",
    sourceTitle: "War and Peace, Book IV, Chapter 11",
    sourceUrl: "https://en.wikiquote.org/wiki/Leo_Tolstoy",
  },
  {
    id: "bacon-make-opportunities",
    quote:
      "지혜로운 사람은\n우연한 기회를 기다리기보다\n더 많은 기회를 만든다.",
    author: "Francis Bacon",
    originalQuote:
      "A wise man will make more opportunities, than he finds.",
    sourceTitle: "Essays, Of Ceremonies and Respect",
    sourceUrl: "https://en.wikiquote.org/wiki/Essays_(Francis_Bacon)",
  },
];

export function getKstHourlyQuoteIndex(date = new Date()): number {
  const hourBucket = Math.floor((date.getTime() + KST_OFFSET_IN_MS) / ONE_HOUR_IN_MS);
  return hourBucket % HEALING_QUOTES.length;
}

export function getHourlyHealingQuote(date = new Date()): HealingQuote {
  return HEALING_QUOTES[getKstHourlyQuoteIndex(date)];
}

export function getMillisecondsUntilNextKstHour(date = new Date()): number {
  const shiftedNow = date.getTime() + KST_OFFSET_IN_MS;
  const remainder = shiftedNow % ONE_HOUR_IN_MS;

  return remainder === 0 ? ONE_HOUR_IN_MS : ONE_HOUR_IN_MS - remainder;
}
