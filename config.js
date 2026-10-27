window.BirthdayConfig = {
  storageKey: 'dasha-birthday-state-v2',
    initialState: {
        screen: 'intro',
        introIndex: 0,
        yearIndex: 0,
        selectedGame: null,
        hintFor: null,
        hintRevealed: false,

        coins: 0,
        completedGames: [],

        reflectionAnswers: {},

        gameState: {
            dice: {
                started: false,
                rolled: false,
                result: null,
                penalty: false,
                rollCount: 0
            },
            photos: {
                round: 0,
                revealed: false,
                hintsUsed: 0,
                score: 0
            },
            future: {
                answers: {},
                checked: false,
                score: 0
            },
            rick: {
                phase: 'select',
                round: 0,
                revealed: false,
                score: 0
            },
            puzzle: {
                started: false,
                round: 0,
                solved: false,
                order: [],
                selected: null
            },
            murdoku: {
                round: 0,
                score: 0
            },
            karaoke: {
                phase: 'songless',
                round: 0,
                revealed: false,
                score: 0
            },
            satellite: {
                round: 0,
                answers: {},
                checked: false,
                hintUsed: false,
                score: 0
            },
            cucumber: {
                round: 0,
                finished: false,
                score: 0
            }
        },

        super: {
            answered: [],
            open: null,
            hintLetter: false,
            hintCount: false,
            hintHalf: false,
            answerRevealed: false
        }
    },
  maxCoins: 300,
  rewards: {
    dice: 20,
    photos: 35,
    future: 35,
    rick: 30,
    puzzle: 40,
    murdoku: 35,
    karaoke: 35,
    satellite: 35,
    cucumber: 20
  },
  helpShop: [
    ['Первая буква ответа', 10],
    ['Количество слов в ответе', 15],
    ['Показать половину ответа', 20],
    ['Пропустить вопрос без ответа', 30],
    ['Пропустить сложный вопрос', 30]
  ]
};
