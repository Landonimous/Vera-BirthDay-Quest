const app = document.getElementById("app");
const POINTS = [100, 200, 300, 400, 500];
const STORAGE_KEY = "birthday-final-quiz-v1";

const pluralRules = new Intl.PluralRules("ru");
const POINT_WORDS = { one: "очко", few: "очка", many: "очков", other: "очка" };

function pointsLabel(value) {
    const number = value < 0 ? `−${Math.abs(value)}` : value;
    return `${number} ${POINT_WORDS[pluralRules.select(Math.abs(value))]}`;
}

function signedPoints(value) {
    return value < 0 ? `−${pointsLabel(Math.abs(value))}` : `+${pointsLabel(value)}`;
}

function createFinalGameState() {
    return {
        team: 0,
        started: false,
        index: 0,
        revealed: false,
        selected: null,
        picks: [],
        done: false
    };
}

function createInitialState() {
    return {
        screen: "board",
        teams: [
            { name: "Команда 1", score: 0 },
            { name: "Команда 2", score: 0 }
        ],
        currentTeam: 0,
        openedQuestion: null,
        revealed: false,
        answered: [],
        wager: 0,
        stage: "question",
        finalGame: createFinalGameState()
    };
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) return createInitialState();

        return {
            ...createInitialState(),
            ...saved,
            finalGame: { ...createFinalGameState(), ...saved.finalGame }
        };
    } catch {
        return createInitialState();
    }
}

let state = loadState();
let lastView = null;

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // без localStorage игра работает, просто не переживёт перезагрузку
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function questionKey(categoryId, points) {
    return `${categoryId}:${points}`;
}

function getQuestion(categoryId, points) {
    const category = QuizData.categories.find(item => item.id === categoryId);
    return category?.questions?.[points] ?? null;
}

function isAnswered(categoryId, points) {
    return state.answered.includes(questionKey(categoryId, points));
}

function imageHtml(src, className, alt) {
    // если файла нет, картинка просто не показывается
    return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" onerror="this.hidden = true">`;
}

function setScreen(screen) {
    state.screen = screen;
    saveState();
    render();
}

function openQuestion(categoryId, points) {
    if (isAnswered(categoryId, points)) return;

    const question = getQuestion(categoryId, points);
    if (!question) return;

    state.openedQuestion = { categoryId, points };
    state.revealed = false;
    state.wager = 0;
    // у вопроса с модификатором сначала показываем правило, сам вопрос потом
    state.stage = question.modifier ? "modifier" : "question";
    state.screen = "question";

    saveState();
    render();
}

function closeQuestion(markAnswered) {
    if (markAnswered && state.openedQuestion) {
        const { categoryId, points } = state.openedQuestion;
        const key = questionKey(categoryId, points);

        if (!state.answered.includes(key)) {
            state.answered.push(key);
        }
    }

    state.openedQuestion = null;
    state.revealed = false;
    state.wager = 0;
    state.stage = "question";
    state.screen = "board";

    saveState();
    render();
}

const TITLES = {
    board: "Викторина",
    question: "Вопрос · Викторина",
    finalGame: "Финальная игра · Викторина",
    final: "Итоги · Викторина"
};

function currentView() {
    if (state.screen === "question") return `question:${state.stage}`;
    if (state.screen === "finalGame") {
        return `finalGame:${state.finalGame.started}:${state.finalGame.index}`;
    }
    return state.screen;
}

function render() {
    if (state.screen === "question") {
        renderQuestion();
    } else if (state.screen === "finalGame") {
        renderFinalGame();
    } else if (state.screen === "final") {
        renderFinal();
    } else {
        renderBoard();
    }

    document.title = TITLES[state.screen] ?? TITLES.board;

    // при смене экрана переносим фокус на заголовок, чтобы клавиатура и
    // экранный диктор начинали с начала нового экрана
    const view = currentView();
    if (lastView !== null && view !== lastView) {
        app.querySelector("h1")?.focus();
    }
    lastView = view;
}

// ------------------------------
// ДОСКА ВОПРОСОВ
// ------------------------------

function renderBoard() {
    const categories = QuizData.categories;
    const finalGame = state.finalGame;

    const allQuestions = categories.every(category =>
        POINTS.every(points => getQuestion(category.id, points))
    );

    const allAnswered = categories.every(category =>
        POINTS.every(points => isAnswered(category.id, points))
    );

    let finalLabel = "Начать финальную игру";
    if (finalGame.started) finalLabel = "Вернуться к финальной игре";
    if (finalGame.done) finalLabel = "Посмотреть итоги";

    app.innerHTML = `
        <div class="page">
            <header class="topbar">
                <div>
                    <p class="eyebrow">Своя игра</p>
                    <h1 tabindex="-1">Викторина</h1>
                </div>
                <button type="button" class="secondary-button" id="resetGame">
                    Начать заново
                </button>
            </header>

            <section class="scoreboard" aria-label="Счёт команд">
                ${state.teams.map((team, index) => `
                    <div class="team-card">
                        <label for="teamName${index}">Название команды ${index + 1}</label>
                        <input
                            id="teamName${index}"
                            data-team-name="${index}"
                            value="${escapeHtml(team.name)}"
                            autocomplete="off"
                        >
                        <strong class="team-score">${pointsLabel(team.score)}</strong>
                    </div>
                `).join("")}
            </section>

            <div class="turn-controls">
                <label for="currentTeam">Сейчас отвечает</label>
                <select id="currentTeam">
                    ${state.teams.map((team, index) => `
                        <option value="${index}" ${state.currentTeam === index ? "selected" : ""}>
                            ${escapeHtml(team.name)}
                        </option>
                    `).join("")}
                </select>
            </div>

            ${!allQuestions ? `
                <p class="notice">
                    В некоторых категориях не хватает вопросов.
                    Добавь их в scripts/content.js.
                </p>
            ` : ""}

            <div class="quiz-board" style="--category-count: ${categories.length}">
                ${categories.map((category, categoryIndex) => `
                    <section class="category-column" style="--cat: var(--color-cat-${categoryIndex % 5 + 1})">
                        <h2>${escapeHtml(category.title)}</h2>

                        ${POINTS.map(points => {
                            const answered = isAnswered(category.id, points);
                            const question = getQuestion(category.id, points);
                            const label = answered
                                ? `Сыгран: ${category.title}, ${points}`
                                : `${points}, ${category.title}`;

                            return `
                                <button
                                    type="button"
                                    class="question-cell ${answered ? "used" : ""}"
                                    data-category="${escapeHtml(category.id)}"
                                    data-points="${points}"
                                    aria-label="${escapeHtml(label)}"
                                    ${answered || !question ? "disabled" : ""}
                                >${answered ? "✓" : points}</button>
                            `;
                        }).join("")}
                    </section>
                `).join("")}
            </div>

            <div class="board-actions">
                <button
                    type="button"
                    class="${allAnswered ? "primary-button" : "secondary-button"}"
                    id="openFinalGame"
                >
                    ${finalLabel}
                </button>
            </div>
        </div>
    `;

    document.querySelectorAll("[data-category]").forEach(button => {
        button.addEventListener("click", () => {
            openQuestion(button.dataset.category, Number(button.dataset.points));
        });
    });

    document.getElementById("currentTeam").addEventListener("change", event => {
        state.currentTeam = Number(event.target.value);
        saveState();
    });

    document.querySelectorAll("[data-team-name]").forEach(input => {
        input.addEventListener("change", () => {
            const index = Number(input.dataset.teamName);
            state.teams[index].name = input.value.trim() || `Команда ${index + 1}`;
            saveState();
            renderBoard();
        });
    });

    document.getElementById("resetGame").addEventListener("click", () => {
        const sure = confirm(
            "Сбросить счёт, сыгранные вопросы и финальную игру? Вернуть их не получится."
        );

        if (sure) {
            state = createInitialState();
            saveState();
            render();
        }
    });

    document.getElementById("openFinalGame").addEventListener("click", () => {
        setScreen(finalGame.done ? "final" : "finalGame");
    });
}

// ------------------------------
// ОТКРЫТЫЙ ВОПРОС
// ------------------------------

function renderQuestion() {
    const opened = state.openedQuestion;
    const category = opened && QuizData.categories.find(item => item.id === opened.categoryId);
    const question = opened && getQuestion(opened.categoryId, opened.points);

    if (!category || !question) {
        state.openedQuestion = null;
        state.screen = "board";
        saveState();
        renderBoard();
        return;
    }

    const modifier = question.modifier;

    if (modifier && state.stage === "modifier") {
        renderModifierIntro(category, opened.points, modifier);
    } else {
        renderQuestionText(category, question, opened.points, modifier);
    }
}

// Экран-сюрприз: правило модификатора видно раньше самого вопроса
function renderModifierIntro(category, points, modifier) {
    const team = state.teams[state.currentTeam];
    const isBet = modifier.type === "bet";
    const maxBet = Math.max(team.score, points);
    const minBet = Math.min(modifier.minBet ?? 0, maxBet);

    app.innerHTML = `
        <div class="page question-page">
            <button type="button" class="text-button" id="backToBoard">
                ← Назад к доске
            </button>

            <p class="eyebrow">${escapeHtml(category.title)} · ${pointsLabel(points)}</p>

            <h1 class="surprise" tabindex="-1">Сюрприз!</h1>

            <section class="modifier-card modifier-intro" aria-labelledby="modifierTitle">
                <h2 id="modifierTitle">${escapeHtml(modifier.title)}</h2>
                <p>${escapeHtml(modifier.description)}</p>

                ${isBet ? `
                    <form id="betForm" novalidate>
                        <div class="field">
                            <label for="wagerInput">
                                Ставка команды «${escapeHtml(team.name)}»
                            </label>
                            <p class="field-hint" id="wagerHint">От ${minBet} до ${maxBet}</p>
                            <input
                                id="wagerInput"
                                type="number"
                                inputmode="numeric"
                                min="${minBet}"
                                max="${maxBet}"
                                step="10"
                                value="${minBet}"
                                aria-describedby="wagerHint wagerError"
                            >
                            <p class="field-error" id="wagerError"></p>
                        </div>
                        <button type="submit" class="primary-button">
                            Поставить и открыть вопрос
                        </button>
                    </form>
                ` : `
                    <button type="button" class="primary-button" id="startQuestion">
                        Открыть вопрос
                    </button>
                `}
            </section>
        </div>
    `;

    document.getElementById("backToBoard").addEventListener("click", () => closeQuestion(false));

    function startQuestion() {
        state.stage = "question";
        saveState();
        render();
    }

    document.getElementById("startQuestion")?.addEventListener("click", startQuestion);

    document.getElementById("betForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const input = document.getElementById("wagerInput");
        const error = document.getElementById("wagerError");
        const wager = Math.floor(Number(input.value));

        if (input.value === "" || !Number.isFinite(wager) || wager < minBet || wager > maxBet) {
            input.setAttribute("aria-invalid", "true");
            error.textContent = `Введите число от ${minBet} до ${maxBet}.`;
            input.focus();
            return;
        }

        state.wager = wager;
        startQuestion();
    });
}

function renderQuestionText(category, question, points, modifier) {
    const team = state.teams[state.currentTeam];
    const isBet = modifier?.type === "bet";
    const gain = isBet ? state.wager : points;
    const loss = isBet ? state.wager : 0;

    app.innerHTML = `
        <div class="page question-page">
            <button type="button" class="text-button" id="backToBoard">
                ← Назад к доске
            </button>

            <p class="eyebrow">${escapeHtml(category.title)} · ${pointsLabel(points)}</p>

            ${modifier ? `<p class="modifier-badge">${escapeHtml(modifier.title)}</p>` : ""}

            <h1 tabindex="-1">${escapeHtml(question.question)}</h1>

            ${question.image
                ? imageHtml(question.image, "question-image", question.imageAlt || "Иллюстрация к вопросу")
                : ""}

            <p class="active-team">
                Отвечает: ${escapeHtml(team.name)}${isBet ? ` · ставка ${pointsLabel(state.wager)}` : ""}
            </p>

            ${state.revealed ? `
                <section class="answer-card" aria-labelledby="answerTitle">
                    <h2 id="answerTitle" tabindex="-1">Правильный ответ</h2>
                    <p>${escapeHtml(question.answer)}</p>
                    ${question.answerImage
                        ? imageHtml(question.answerImage, "answer-image", question.answerImageAlt || question.answer)
                        : ""}
                </section>

                ${modifier?.type === "request" ? `
                    <div class="field">
                        <label for="bonusInput">Дополнительные очки от ведущих</label>
                        <input id="bonusInput" type="number" inputmode="numeric" min="0" value="0">
                    </div>
                ` : ""}

                <div class="answer-controls">
                    <button type="button" class="primary-button" id="correctAnswer">
                        Засчитать: ${signedPoints(gain)}
                    </button>
                    <button type="button" class="secondary-button" id="wrongAnswer">
                        Не засчитывать${loss ? `: ${signedPoints(-loss)}` : ""}
                    </button>
                </div>
            ` : `
                <button type="button" class="primary-button" id="revealAnswer">
                    Показать ответ
                </button>
            `}
        </div>
    `;

    document.getElementById("backToBoard").addEventListener("click", () => closeQuestion(false));

    document.getElementById("revealAnswer")?.addEventListener("click", () => {
        state.revealed = true;
        saveState();
        render();
        document.getElementById("answerTitle")?.focus();
    });

    document.getElementById("correctAnswer")?.addEventListener("click", () => {
        const bonus = getApprovedBonus(modifier);
        if (bonus === null) return;

        state.teams[state.currentTeam].score += gain + bonus;
        closeQuestion(true);
    });

    document.getElementById("wrongAnswer")?.addEventListener("click", () => {
        state.teams[state.currentTeam].score -= loss;
        closeQuestion(true);
    });
}

function getApprovedBonus(modifier) {
    if (modifier?.type !== "request") return 0;

    const bonus = Number(document.getElementById("bonusInput").value);

    if (!Number.isFinite(bonus) || bonus < 0) {
        alert("Введите количество дополнительных очков, 0 или больше.");
        return null;
    }

    return Math.floor(bonus);
}

// ------------------------------
// ФИНАЛЬНАЯ ИГРА
// ------------------------------

function finalGameEarned() {
    return state.finalGame.picks.reduce((sum, pick) => sum + pick.points, 0);
}

function renderFinalGame() {
    const questions = QuizData.finalGame?.questions ?? [];
    const finalGame = state.finalGame;

    if (!questions.length) {
        app.innerHTML = `
            <div class="page question-page">
                <button type="button" class="text-button" id="backToBoard">← Назад к доске</button>
                <h1 tabindex="-1">Финальная игра</h1>
                <p class="notice">
                    Вопросов пока нет. Добавь их в scripts/content.js, в раздел finalGame.
                </p>
            </div>
        `;
        document.getElementById("backToBoard").addEventListener("click", () => setScreen("board"));
        return;
    }

    if (!finalGame.started) {
        renderFinalGameIntro(questions);
        return;
    }

    if (finalGame.index >= questions.length) {
        finalGame.done = true;
        state.screen = "final";
        saveState();
        renderFinal();
        return;
    }

    const item = questions[finalGame.index];
    const team = state.teams[finalGame.team] ?? state.teams[0];
    const isLast = finalGame.index === questions.length - 1;
    const nextLabel = isLast ? "Завершить и посмотреть итоги" : "Следующий вопрос";
    const progress = Math.round((finalGame.index / questions.length) * 100);

    app.innerHTML = `
        <div class="page question-page">
            <button type="button" class="text-button" id="backToBoard">← Назад к доске</button>

            <p class="eyebrow">Финальная игра · вопрос ${finalGame.index + 1} из ${questions.length}</p>
            <div class="progress" aria-hidden="true"><span style="width: ${progress}%"></span></div>

            <h1 tabindex="-1">${escapeHtml(item.question)}</h1>

            <p class="active-team">
                Играет: ${escapeHtml(team.name)} · в финале набрано ${pointsLabel(finalGameEarned())}
            </p>

            ${finalGame.revealed ? `
                <h2 class="visually-hidden" id="optionsTitle" tabindex="-1">Варианты ответа</h2>

                <ul class="final-options" aria-labelledby="optionsTitle">
                    ${item.options.map((option, index) => `
                        <li style="--i: ${index}">
                            <button
                                type="button"
                                class="final-option"
                                data-option="${index}"
                                aria-pressed="${finalGame.selected === index}"
                            >
                                <span class="option-text">${escapeHtml(option.text)}</span>
                                <span class="option-points">${signedPoints(option.points)}</span>
                                <span class="option-flag">✓ Выбран</span>
                            </button>
                        </li>
                    `).join("")}
                </ul>

                <p class="field-error" id="finalError" role="status"></p>

                <div class="answer-controls">
                    <button type="button" class="primary-button" id="nextFinal">${nextLabel}</button>
                </div>

                <p class="footnote">Выбор можно поменять, пока не нажата кнопка «${nextLabel}».</p>
            ` : `
                <button type="button" class="primary-button" id="revealOptions">
                    Показать варианты
                </button>
            `}
        </div>
    `;

    document.getElementById("backToBoard").addEventListener("click", () => setScreen("board"));

    document.getElementById("revealOptions")?.addEventListener("click", () => {
        finalGame.revealed = true;
        saveState();
        render();
        document.getElementById("optionsTitle")?.focus();
    });

    // выбор меняем без перерисовки, чтобы не сбивать фокус и анимацию
    document.querySelectorAll("[data-option]").forEach(button => {
        button.addEventListener("click", () => {
            finalGame.selected = Number(button.dataset.option);
            saveState();

            document.querySelectorAll("[data-option]").forEach(other => {
                other.setAttribute("aria-pressed", String(other === button));
            });
            document.getElementById("finalError").textContent = "";
        });
    });

    document.getElementById("nextFinal")?.addEventListener("click", () => {
        if (finalGame.selected === null) {
            document.getElementById("finalError").textContent =
                "Сначала выберите один из вариантов.";
            document.querySelector("[data-option]")?.focus();
            return;
        }

        const option = item.options[finalGame.selected];
        state.teams[finalGame.team].score += option.points;
        finalGame.picks.push({ question: finalGame.index, option: finalGame.selected, points: option.points });
        finalGame.index += 1;
        finalGame.revealed = false;
        finalGame.selected = null;

        if (finalGame.index >= questions.length) {
            finalGame.done = true;
            state.screen = "final";
        }

        saveState();
        render();
    });
}

function renderFinalGameIntro(questions) {
    const finalGame = state.finalGame;

    app.innerHTML = `
        <div class="page question-page">
            <button type="button" class="text-button" id="backToBoard">← Назад к доске</button>

            <p class="eyebrow">Финальная игра</p>
            <h1 tabindex="-1">${escapeHtml(QuizData.finalGame.title || "Финальная игра")}</h1>

            <p class="lead">
                Вопросы идут по одному. После каждого появляются варианты ответа,
                и у каждого своя цена. Игрок выбирает один вариант, и его команда
                получает столько очков, сколько он стоит.
            </p>

            <p class="footnote">Вопросов в финале: ${questions.length}</p>

            <div class="field">
                <label for="finalTeam">Кто играет финал</label>
                <select id="finalTeam">
                    ${state.teams.map((team, index) => `
                        <option value="${index}" ${state.currentTeam === index ? "selected" : ""}>
                            ${escapeHtml(team.name)}
                        </option>
                    `).join("")}
                </select>
            </div>

            <button type="button" class="primary-button" id="startFinal">
                Начать финальную игру
            </button>
        </div>
    `;

    document.getElementById("backToBoard").addEventListener("click", () => setScreen("board"));

    document.getElementById("startFinal").addEventListener("click", () => {
        finalGame.team = Number(document.getElementById("finalTeam").value);
        finalGame.started = true;
        finalGame.index = 0;
        saveState();
        render();
    });
}

// ------------------------------
// ИТОГИ
// ------------------------------

function renderFinal() {
    const ranking = [...state.teams].sort((a, b) => b.score - a.score);
    const finalGame = state.finalGame;
    const finalTeam = state.teams[finalGame.team];

    app.innerHTML = `
        <div class="page final-page">
            <p class="eyebrow">Игра завершена</p>
            <h1 tabindex="-1">Итоги</h1>

            <ol class="ranking">
                ${ranking.map(team => `
                    <li>
                        <span>${escapeHtml(team.name)}</span>
                        <strong class="team-score">${pointsLabel(team.score)}</strong>
                    </li>
                `).join("")}
            </ol>

            ${finalGame.picks.length && finalTeam ? `
                <p class="lead">
                    В финальной игре команда «${escapeHtml(finalTeam.name)}»
                    набрала ${pointsLabel(finalGameEarned())}.
                </p>
            ` : ""}

            <button type="button" class="primary-button" id="backToResultsBoard">
                Вернуться к доске
            </button>
        </div>
    `;

    document.getElementById("backToResultsBoard").addEventListener("click", () => {
        setScreen("board");
    });
}

render();
