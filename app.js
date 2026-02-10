
// State
let generatedData = null;

// UI Toggles
function toggleSettings() {
    const settings = document.getElementById('apiSettings');
    settings.classList.toggle('show');
}

function switchTab(tabName) {
    // Hide all
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show specific
    if (tabName === 'simple') {
        document.getElementById('simpleTab').classList.add('active');
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
    } else if (tabName === 'complex') {
        document.getElementById('complexTab').classList.add('active');
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
    } else if (tabName === 'analysis') {
        document.getElementById('analysisTab').classList.add('active');
        document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
    }
}

// CEFR 难度等级描述映射
const CEFR_DESCRIPTIONS = {
    'A1': {
        name: 'Beginner (入门级)',
        guidelines: `
- Use only the most basic vocabulary (high-frequency words like: is, have, go, come, like, want)
- Very short, simple sentences (5-8 words max)
- Present tense only
- No idioms, no phrasal verbs
- Repetition of key structures is encouraged
- Story length: approx 80 words
- Complex text: approx 50 words, still simple but slightly more formal`
    },
    'A2': {
        name: 'Elementary (基础级)',
        guidelines: `
- Common everyday vocabulary
- Simple and compound sentences (use "and", "but", "because")
- Past simple and present continuous allowed
- Basic phrasal verbs (look at, get up)
- Story length: approx 100 words
- Complex text: approx 70 words`
    },
    'B1': {
        name: 'Intermediate (中级)',
        guidelines: `
- Wider range of vocabulary including some less common words
- Complex sentences with dependent clauses (when, if, although)
- All basic tenses including present perfect
- Common idioms and phrasal verbs allowed
- Story length: approx 150 words
- Complex text: approx 100 words`
    },
    'B2': {
        name: 'Upper-Intermediate (中高级)',
        guidelines: `
- Rich vocabulary including abstract and topic-specific words
- Complex sentence structures, passive voice, conditionals
- All tenses including past perfect
- Idiomatic expressions and varied phrasal verbs
- Story length: approx 180 words
- Complex text: approx 120 words, more formal and nuanced`
    },
    'C1': {
        name: 'Advanced (高级)',
        guidelines: `
- Sophisticated and nuanced vocabulary
- Complex grammatical structures, advanced conditionals, subjunctive
- Idiomatic and colloquial expressions freely used
- Subtle shades of meaning, irony, and rhetorical devices
- Story length: approx 200+ words
- Complex text: approx 150 words, academic or journalistic style`
    },
    'C2': {
        name: 'Mastery (精通级)',
        guidelines: `
- Near-native proficiency, full command of sophisticated vocabulary
- Effortless use of complex grammatical structures, nuanced expressions
- Literary devices, abstract reasoning, and cultural references
- Ability to appreciate subtle differences in meaning and register
- Story length: approx 250+ words
- Complex text: approx 200 words, publishable quality, elegant prose`
    }
};

// Main Generation Logic
async function generateStory() {
    const words = document.getElementById('wordsInput').value;
    const theme = document.getElementById('themeSelect').options[document.getElementById('themeSelect').selectedIndex].text;
    const difficulty = document.getElementById('difficultySelect').value;
    const difficultyInfo = CEFR_DESCRIPTIONS[difficulty];
    const lengthOption = document.getElementById('lengthSelect').value;
    const apiKey = document.getElementById('apiKey').value;
    const modelId = document.getElementById('modelId').value;
    const btn = document.getElementById('generateBtn');

    if (!words.trim()) {
        alert("Please enter some words!");
        return;
    }

    // UI Loading State
    btn.innerHTML = '<div class="loader"></div> Generating...';
    btn.disabled = true;

    // Prompt Construction with CEFR level
    // 文章长度配置
    const lengthConfig = lengthOption === 'long'
        ? { simple: '250-350', complex: '200-300', label: 'LONG' }
        : { simple: '100-150', complex: '80-120', label: 'SHORT' };

    const systemPrompt = `You are an expert English teacher specializing in CEFR-aligned content creation.
    The learner's current level is: **${difficulty} - ${difficultyInfo.name}**.
    Article length preference: **${lengthConfig.label}**
    
    IMPORTANT LANGUAGE GUIDELINES for ${difficulty}:
    ${difficultyInfo.guidelines}

    Your task is to take a list of words and a theme, then generate the following in JSON format:
    1. 'simple_text': An engaging short story using ALL the input words naturally. The story MUST follow the theme: "${theme}". Strictly adhere to the ${difficulty} language guidelines above. The story should be approximately ${lengthConfig.simple} words.
    2. 'simple_text_cn': The Chinese translation of 'simple_text'. Should be natural and fluent Chinese.
    3. 'simple_quiz': An array of exactly 3 multiple-choice questions about the simple_text story. Each question object must have:
       - 'question': The question in English (suitable for ${difficulty} level).
       - 'options': An array of exactly 4 options (A, B, C, D).
       - 'correct_answer': The correct option letter (A, B, C, or D).
    4. 'complex_text': A slightly more formal text (news snippet, diary entry, or informational paragraph) using the words. Still respects the ${difficulty} level but feels more "real-world". Approximately ${lengthConfig.complex} words.
    5. 'complex_text_cn': The Chinese translation of 'complex_text'.
    6. 'complex_quiz': An array of exactly 3 multiple-choice questions about the complex_text. Same format as simple_quiz.
    7. 'vocabulary_data': An array of objects for each input word. Each object must have:
       - 'word': The word itself.
       - 'definition_cn': A concise Chinese definition.
       - 'pronunciation_guide': IPA or phonetic spelling.
       - 'sentence_example': A separate example sentence (not from the story), suitable for ${difficulty} level.

    IMPORTANT: Return ONLY valid JSON. No extra text before or after.
    `;

    const userPrompt = `Words: ${words}`;

    try {
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Parse JSON (Handling potential markdown code blocks)
        let jsonStr = content;
        if (content.includes('```json')) {
            jsonStr = content.split('```json')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            jsonStr = content.split('```')[1].split('```')[0].trim();
        }

        generatedData = JSON.parse(jsonStr);
        renderResults(generatedData, words.split(',').map(w => w.trim()));

    } catch (error) {
        console.error(error);
        alert("Error generating content: " + error.message);
    } finally {
        btn.innerHTML = '✨ 生成语境故事 (Weave Context)';
        btn.disabled = false;
    }
}

// Rendering Logic
function renderResults(data, inputWords) {
    document.getElementById('resultsSection').classList.add('active');


    // Highlight function
    const highlight = (text) => {
        let processedText = text;
        // Identify words to highlight (case insensitive)
        inputWords.forEach(word => {
            if (word.length < 2) return;
            // No tooltip, just highlight and click-to-speak
            const regex = new RegExp(`\\b(${word})\\b`, 'gi');
            processedText = processedText.replace(regex, `<span class="highlight-word" onclick="speakWord('$1')">$1</span>`);
        });
        return processedText;
    };

    // Render Texts
    document.getElementById('simpleTextOutput').innerHTML = highlight(data.simple_text);
    document.getElementById('complexTextOutput').innerHTML = highlight(data.complex_text);

    // Render Translations (always render, but start collapsed)
    const simpleTransBox = document.getElementById('simpleTranslationBox');
    const complexTransBox = document.getElementById('complexTranslationBox');

    if (data.simple_text_cn) {
        document.getElementById('simpleTranslation').textContent = data.simple_text_cn;
        simpleTransBox.style.display = 'block';
    } else {
        simpleTransBox.style.display = 'none';
    }

    if (data.complex_text_cn) {
        document.getElementById('complexTranslation').textContent = data.complex_text_cn;
        complexTransBox.style.display = 'block';
    } else {
        complexTransBox.style.display = 'none';
    }

    // Render Quizzes
    if (data.simple_quiz && data.simple_quiz.length > 0) {
        renderQuiz('simple', data.simple_quiz);
    }
    if (data.complex_quiz && data.complex_quiz.length > 0) {
        renderQuiz('complex', data.complex_quiz);
    }

    // Render Vocab Analysis
    const vocabContainer = document.getElementById('vocabList');
    vocabContainer.innerHTML = '';

    data.vocabulary_data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'vocab-card';
        card.innerHTML = `
            <div class="vocab-word">
                ${item.word}
                <button class="speak-btn" onclick="speakWord('${item.word}')">
                    <ion-icon name="volume-medium"></ion-icon>
                </button>
            </div>
            <div class="vocab-def">/${item.pronunciation_guide}/ ${item.definition_cn}</div>
            <div class="vocab-example">"${item.sentence_example}"</div>
        `;
        vocabContainer.appendChild(card);
    });
}

// TTS State
let currentUtterance = null;
let isPaused = false;
let currentType = null;
let voices = [];

function populateVoices() {
    voices = window.speechSynthesis.getVoices();
    const voiceSelects = [
        document.getElementById('simpleVoiceSelect'),
        document.getElementById('complexVoiceSelect')
    ];

    voiceSelects.forEach(select => {
        if (!select) return;
        // Keep the default option
        const defaultOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(defaultOption);

        voices.forEach((voice, index) => {
            // Filter for English voices primarily, or all if preferred
            if (voice.lang.includes('en')) {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = index;
                select.appendChild(option);
            }
        });
    });
}

// Wait for voices to be loaded
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
}
// Also try immediately
populateVoices();

// Toggle Translation Collapse
function toggleTranslation(type) {
    const textEl = document.getElementById(`${type}Translation`);
    const iconEl = document.getElementById(`${type}TransIcon`);

    if (textEl.classList.contains('collapsed')) {
        textEl.classList.remove('collapsed');
        iconEl.setAttribute('name', 'chevron-up-outline');
    } else {
        textEl.classList.add('collapsed');
        iconEl.setAttribute('name', 'chevron-down-outline');
    }
}

// TTS with Speed and Pause/Resume
function togglePlayback(type) {
    const synth = window.speechSynthesis;
    const playBtn = document.getElementById(`${type}PlayBtn`);
    const speedSelect = document.getElementById(`${type}SpeedSelect`);
    const speed = parseFloat(speedSelect.value);

    // Voice selection
    const voiceSelect = document.getElementById(`${type}VoiceSelect`);
    const selectedVoiceIndex = voiceSelect.value;


    // If already speaking this type, toggle pause/resume
    if (synth.speaking && currentType === type) {
        if (isPaused) {
            synth.resume();
            isPaused = false;
            playBtn.innerHTML = '<ion-icon name="pause-outline" size="large"></ion-icon> 暂停';
        } else {
            synth.pause();
            isPaused = true;
            playBtn.innerHTML = '<ion-icon name="play-outline" size="large"></ion-icon> 继续';
        }
        return;
    }

    // Start new playback
    synth.cancel();
    isPaused = false;
    currentType = type;

    const textEl = document.getElementById(`${type}TextOutput`);
    const text = textEl.innerText;

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = speed;

    // Apply selected voice if any
    if (selectedVoiceIndex !== "") {
        currentUtterance.voice = voices[selectedVoiceIndex];
    }

    currentUtterance.onstart = () => {
        playBtn.innerHTML = '<ion-icon name="pause-outline" size="large"></ion-icon> 暂停';
    };

    currentUtterance.onend = () => {
        playBtn.innerHTML = '<ion-icon name="play-outline" size="large"></ion-icon> 朗读';
        currentType = null;
    };

    currentUtterance.onerror = () => {
        playBtn.innerHTML = '<ion-icon name="play-outline" size="large"></ion-icon> 朗读';
        currentType = null;
    };

    synth.speak(currentUtterance);
}

function stopPlayback() {
    const synth = window.speechSynthesis;
    synth.cancel();
    isPaused = false;
    currentType = null;

    // Reset all play buttons
    ['simple', 'complex'].forEach(type => {
        const btn = document.getElementById(`${type}PlayBtn`);
        if (btn) {
            btn.innerHTML = '<ion-icon name="play-outline" size="large"></ion-icon> 朗读';
        }
    });
}

function speakWord(word) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}

// Quiz State
let quizAnswers = {
    simple: {},
    complex: {}
};

// Render Quiz
function renderQuiz(type, quizData) {
    const quizSection = document.getElementById(`${type}QuizSection`);
    const quizList = document.getElementById(`${type}QuizList`);
    const resultBox = document.getElementById(`${type}QuizResult`);
    const submitBtn = document.getElementById(`${type}SubmitQuiz`);

    // Reset state
    quizAnswers[type] = {};
    resultBox.style.display = 'none';
    submitBtn.style.display = 'block';
    submitBtn.disabled = false;
    quizList.innerHTML = '';
    quizSection.style.display = 'block';

    quizData.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'quiz-question';
        questionDiv.dataset.correctAnswer = q.correct_answer;

        let optionsHtml = '';
        const optionLabels = ['A', 'B', 'C', 'D'];
        q.options.forEach((opt, optIndex) => {
            const label = optionLabels[optIndex];
            optionsHtml += `
                <label class="quiz-option" data-option="${label}">
                    <input type="radio" name="${type}_q${index}" value="${label}" onchange="selectAnswer('${type}', ${index}, '${label}')">
                    <span class="option-marker">${label}</span>
                    <span class="option-text">${opt}</span>
                </label>
            `;
        });

        questionDiv.innerHTML = `
            <div class="question-number">第 ${index + 1} 题</div>
            <div class="question-text">${q.question}</div>
            <div class="options-list">${optionsHtml}</div>
        `;
        quizList.appendChild(questionDiv);
    });
}

// Select Answer
function selectAnswer(type, questionIndex, answer) {
    quizAnswers[type][questionIndex] = answer;
}

// Submit Quiz
function submitQuiz(type) {
    const quizData = type === 'simple' ? generatedData.simple_quiz : generatedData.complex_quiz;
    const resultBox = document.getElementById(`${type}QuizResult`);
    const submitBtn = document.getElementById(`${type}SubmitQuiz`);
    const quizList = document.getElementById(`${type}QuizList`);

    let correctCount = 0;

    // Check answers and highlight
    quizData.forEach((q, index) => {
        const userAnswer = quizAnswers[type][index];
        const correctAnswer = q.correct_answer;
        const questionDiv = quizList.children[index];
        const options = questionDiv.querySelectorAll('.quiz-option');

        options.forEach(opt => {
            const optValue = opt.dataset.option;
            opt.classList.remove('correct', 'incorrect', 'missed');

            if (optValue === correctAnswer) {
                opt.classList.add('correct');
            }
            if (optValue === userAnswer && userAnswer !== correctAnswer) {
                opt.classList.add('incorrect');
            }
        });

        if (userAnswer === correctAnswer) {
            correctCount++;
        }
    });

    // Calculate grade
    let grade = '';
    let gradeClass = '';
    if (correctCount === 3) {
        grade = '🏆 优秀 (Excellent!)';
        gradeClass = 'grade-excellent';
    } else if (correctCount === 2) {
        grade = '👍 良好 (Good!)';
        gradeClass = 'grade-good';
    } else {
        grade = '📖 需要加油 (Keep Learning!)';
        gradeClass = 'grade-fail';
    }

    resultBox.innerHTML = `
        <div class="result-score">答对 ${correctCount} / 3 题</div>
        <div class="result-grade ${gradeClass}">${grade}</div>
    `;
    resultBox.style.display = 'block';
    submitBtn.disabled = true;
}
