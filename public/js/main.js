// ===== Mobile Menu Toggle =====
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
}

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
    });
});

// ===== Active Nav Link =====
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
    }
});

// ===== Back to Top Button =====
const backToTop = document.querySelector('.back-to-top');
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== Quiz Functionality =====
const quizData = [
    {
        question: "Apa kepanjangan dari HTML?",
        options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Logic", "Home Tool Markup Language"],
        correct: 0,
        explanation: "HTML adalah singkatan dari HyperText Markup Language. 'HyperText' merujuk pada teks yang memiliki tautan ke teks lain, dan 'Markup Language' adalah bahasa untuk menandai struktur dokumen. HTML digunakan sebagai fondasi untuk membuat setiap halaman web."
    },
    {
        question: "CSS digunakan untuk?",
        options: ["Membuat struktur halaman web", "Mempercantik tampilan halaman web", "Memproses data di server", "Mengelola database"],
        correct: 1,
        explanation: "CSS (Cascading Style Sheets) digunakan untuk mengatur tampilan visual halaman web seperti warna, font, layout, margin, padding, dan efek lainnya. CSS memisahkan presentasi (tampilan) dari struktur (HTML)."
    },
    {
        question: "Bahasa pemrograman apakah yang berjalan di browser?",
        options: ["Python", "Java", "JavaScript", "C++"],
        correct: 2,
        explanation: "JavaScript adalah satu-satunya bahasa pemrograman yang bisa dijalankan langsung di browser. Browser memiliki JavaScript Engine (seperti V8 di Chrome) yang mengeksekusi kode JavaScript. Python, Java, dan C++ berjalan di sisi server, bukan di browser."
    },
    {
        question: "Apa fungsi dari tag <a> pada HTML?",
        options: ["Menambahkan gambar", "Membuat paragraf", "Membuat tautan/link", "Membuat tabel"],
        correct: 2,
        explanation: "Tag <a> (anchor) digunakan untuk membuat tautan atau link ke halaman lain, file, atau bagian tertentu. Fungsi utamanya adalah navigasi. Contoh: <a href='https://google.com'>Kunjungi Google</a>. Tag untuk gambar adalah <img>, paragraf adalah <p>, dan tabel adalah <table>."
    },
    {
        question: "Manakah yang merupakan framework CSS?",
        options: ["Django", "Laravel", "Tailwind CSS", "Node.js"],
        correct: 2,
        explanation: "Tailwind CSS adalah framework CSS utility-first yang memungkinkan kamu membuat desain dengan cepat menggunakan class-class siap pakai. Django adalah framework Python (backend), Laravel adalah framework PHP (backend), dan Node.js adalah runtime JavaScript (backend)."
    },
    {
        question: "Apa itu DOM dalam web development?",
        options: ["Database Object Model", "Document Object Model", "Data Output Manager", "Digital Operating Module"],
        correct: 1,
        explanation: "DOM (Document Object Model) adalah representasi struktur HTML dalam bentuk pohon objek yang bisa diakses dan dimanipulasi oleh JavaScript. Dengan DOM, JavaScript bisa mengubah isi teks, menambah elemen, mengubah style, dan merespon event pengguna."
    },
    {
        question: "Method HTTP apa yang digunakan untuk mengambil data?",
        options: ["POST", "PUT", "GET", "DELETE"],
        correct: 2,
        explanation: "GET adalah method HTTP yang digunakan untuk mengambil/membaca data dari server. POST digunakan untuk mengirim data baru, PUT untuk memperbarui data, dan DELETE untuk menghapus data. Dalam konsep REST API, GET setara dengan operasi 'Read'."
    },
    {
        question: "Apa kepanjangan dari CSS?",
        options: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"],
        correct: 1,
        explanation: "CSS adalah singkatan dari Cascading Style Sheets. Kata 'Cascading' merujuk pada cara CSS menerapkan aturan style secara berjenjang — ada urutan prioritas dalam menentukan style mana yang berlaku pada sebuah elemen (inline > internal > external)."
    }
];

let currentQuestion = 0;
let score = 0;
let answered = false;
let userAnswers = [];

function getUser() {
    try { return JSON.parse(localStorage.getItem('WEB-FIS_user')); } catch { return null; }
}

function loadQuestion() {
    const quizCard = document.getElementById('quiz-card');
    if (!quizCard || currentQuestion >= quizData.length) return showResult();

    const q = quizData[currentQuestion];
    answered = false;

    document.getElementById('progress-bar').style.width = 
        `${((currentQuestion) / quizData.length) * 100}%`;

    quizCard.innerHTML = `
        <div class="question-number">Pertanyaan ${currentQuestion + 1} dari ${quizData.length}</div>
        <div class="question">${q.question}</div>
        <div class="quiz-options">
            ${q.options.map((opt, i) => `
                <button class="quiz-option" onclick="selectAnswer(${i})" data-index="${i}">
                    ${opt}
                </button>
            `).join('')}
        </div>
        <div class="quiz-actions">
            <button class="btn btn-primary" id="next-btn" onclick="nextQuestion()" style="display:none;">
                ${currentQuestion === quizData.length - 1 ? 'Lihat Hasil' : 'Selanjutnya →'}
            </button>
        </div>
    `;
}

function selectAnswer(index) {
    if (answered) return;
    answered = true;

    const q = quizData[currentQuestion];
    const options = document.querySelectorAll('.quiz-option');
    const isCorrect = index === q.correct;

    options.forEach((opt, i) => {
        if (i === q.correct) opt.classList.add('correct');
        if (i === index && !isCorrect) opt.classList.add('wrong');
        opt.style.pointerEvents = 'none';
    });

    if (isCorrect) score++;

    userAnswers.push({
        questionIndex: currentQuestion,
        selected: index,
        selectedText: q.options[index],
        correct: q.correct,
        correctText: q.options[q.correct],
        isCorrect
    });

    const explanationHTML = !isCorrect ? `
        <div class="explanation-box">
            <div class="explanation-title">💡 Penjelasan:</div>
            <p>${q.explanation}</p>
        </div>
    ` : '';

    const quizActions = document.querySelector('.quiz-actions');
    quizActions.insertAdjacentHTML('beforebegin', explanationHTML);

    document.getElementById('next-btn').style.display = 'inline-block';
}

function nextQuestion() {
    currentQuestion++;
    loadQuestion();
}

function showResult() {
    const quizCard = document.getElementById('quiz-card');
    if (!quizCard) return;

    document.getElementById('progress-bar').style.width = '100%';

    const percentage = Math.round((score / quizData.length) * 100);
    let message = '';
    if (percentage >= 80) message = 'Luar biasa! Kamu sangat memahami materi!';
    else if (percentage >= 60) message = 'Bagus! Masih ada sedikit yang perlu dipelajari.';
    else message = 'Semangat! Coba pelajari lagi materinya ya.';

    // Simpan ke server jika sudah login
    const user = getUser();
    if (user && user.id) {
        fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: user.id,
                score,
                total: quizData.length,
                percentage,
                answers: userAnswers
            })
        }).then(() => console.log('Hasil kuis tersimpan'));
    }

    const savedMsg = user ? '<p style="color:var(--success); font-size:0.9rem; margin-top:0.5rem;">✓ Hasil tersimpan ke akun kamu</p>' : '<p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.5rem;"><a href="login.html">Login</a> untuk menyimpan hasil kuis</p>';

    quizCard.innerHTML = `
        <div class="quiz-result">
            <div class="score">${percentage}%</div>
            <p style="font-size:1.1rem; font-weight:600;">${score} dari ${quizData.length} benar</p>
            <div class="message">${message}</div>
            ${savedMsg}
            <button class="btn btn-primary" onclick="resetQuiz()" style="margin-top:1rem;">🔄 Ulangi Kuis</button>
        </div>
    `;

    userAnswers = [];
}

function resetQuiz() {
    currentQuestion = 0;
    score = 0;
    loadQuestion();
}

// Init quiz if on quiz page
if (document.getElementById('quiz-card')) {
    loadQuestion();
}

// ===== Animate on scroll =====
const observerOptions = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

document.querySelectorAll('.card, .materi-item, .team-card').forEach(el => {
    observer.observe(el);
});
