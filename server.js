const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin credentials
const ADMIN_NIM = 'ADMIN';
const ADMIN_PASSWORD = 'admin123';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Helper: baca JSON
function readJSON(filename) {
    const filepath = path.join(__dirname, 'data', filename);
    try {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch {
        return [];
    }
}

// Helper: tulis JSON
function writeJSON(filename, data) {
    const filepath = path.join(__dirname, 'data', filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

// ==================== AUTH ====================

// Register
app.post('/api/register', (req, res) => {
    const { name, nim } = req.body;

    if (!name || !nim) {
        return res.status(400).json({ error: 'Nama dan NIM wajib diisi' });
    }

    const students = readJSON('students.json');

    if (students.find(s => s.nim === nim)) {
        return res.status(400).json({ error: 'NIM sudah terdaftar' });
    }

    const newStudent = {
        id: uuidv4(),
        name: name.trim(),
        nim: nim.trim(),
        role: 'student',
        createdAt: new Date().toISOString()
    };

    students.push(newStudent);
    writeJSON('students.json', students);

    // Init progress
    const progress = readJSON('progress.json');
    progress.push({
        studentId: newStudent.id,
        materiAccessed: [],
        lastAccess: null
    });
    writeJSON('progress.json', progress);

    res.json({ success: true, message: 'Registrasi berhasil' });
});

// Login Siswa — cocokkan nama + NIM
app.post('/api/login', (req, res) => {
    const { name, nim } = req.body;

    if (!name || !nim) {
        return res.status(400).json({ error: 'Nama dan NIM wajib diisi' });
    }

    const students = readJSON('students.json');
    const student = students.find(s => s.name === name.trim() && s.nim === nim.trim());

    if (!student) {
        return res.status(401).json({ error: 'Nama atau NIM tidak sesuai. Silakan cek kembali data anda.' });
    }

    res.json({
        success: true,
        student: {
            id: student.id,
            name: student.name,
            nim: student.nim,
            role: student.role
        }
    });
});

// Login Admin
app.post('/api/admin/login', (req, res) => {
    const { nim, password } = req.body;

    if (nim === ADMIN_NIM && password === ADMIN_PASSWORD) {
        res.json({
            success: true,
            admin: {
                id: 'admin',
                name: 'Administrator',
                nim: ADMIN_NIM,
                role: 'admin'
            }
        });
    } else {
        res.status(401).json({ error: 'NIM Admin atau Password salah' });
    }
});

// ==================== MATERI PROGRESS ====================

// Tandai materi sudah diakses
app.post('/api/progress/access', (req, res) => {
    const { studentId, bab } = req.body;

    const progress = readJSON('progress.json');
    let studentProgress = progress.find(p => p.studentId === studentId);

    if (!studentProgress) {
        studentProgress = { studentId, materiAccessed: [], lastAccess: null };
        progress.push(studentProgress);
    }

    if (!studentProgress.materiAccessed.includes(bab)) {
        studentProgress.materiAccessed.push(bab);
    }
    studentProgress.lastAccess = new Date().toISOString();

    writeJSON('progress.json', progress);
    res.json({ success: true, materiAccessed: studentProgress.materiAccessed });
});

// Ambil progress siswa
app.get('/api/progress/:studentId', (req, res) => {
    const progress = readJSON('progress.json');
    const studentProgress = progress.find(p => p.studentId === req.params.studentId);

    if (!studentProgress) {
        return res.json({ materiAccessed: [], lastAccess: null });
    }

    res.json(studentProgress);
});

// ==================== QUIZ RESULTS ====================

// Simpan hasil kuis
app.post('/api/quiz/submit', (req, res) => {
    const { studentId, score, total, answers, percentage } = req.body;

    const results = readJSON('quiz-results.json');
    const newResult = {
        id: uuidv4(),
        studentId,
        score,
        total,
        percentage,
        answers,
        submittedAt: new Date().toISOString()
    };

    results.push(newResult);
    writeJSON('quiz-results.json', results);

    res.json({ success: true, result: newResult });
});

// Ambil riwayat kuis siswa
app.get('/api/quiz/:studentId', (req, res) => {
    const results = readJSON('quiz-results.json');
    const studentResults = results
        .filter(r => r.studentId === req.params.studentId)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json(studentResults);
});

// ==================== ADMIN ====================

// Semua siswa + data lengkap
app.get('/api/admin/students', (req, res) => {
    const students = readJSON('students.json');
    const progress = readJSON('progress.json');
    const results = readJSON('quiz-results.json');

    const data = students.map(s => {
        const p = progress.find(pr => pr.studentId === s.id) || { materiAccessed: [], lastAccess: null };
        const r = results.filter(re => re.studentId === s.id);

        return {
            id: s.id,
            name: s.name,
            nim: s.nim,
            role: s.role,
            createdAt: s.createdAt,
            materiAccessed: p.materiAccessed,
            lastAccess: p.lastAccess,
            quizCount: r.length,
            quizResults: r.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
            avgScore: r.length > 0 ? Math.round(r.reduce((sum, x) => sum + x.percentage, 0) / r.length) : 0
        };
    });

    res.json(data);
});

// Detail jawaban per kuis
app.get('/api/admin/quiz-detail/:quizId', (req, res) => {
    const results = readJSON('quiz-results.json');
    const result = results.find(r => r.id === req.params.quizId);

    if (!result) {
        return res.status(404).json({ error: 'Data tidak ditemukan' });
    }

    res.json(result);
});

// ==================== START ====================

const os = require('os');
const { execSync, spawn } = require('child_process');
const cloudflared = require('cloudflared');

// Ambil IP lokal yang aktif
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return { ip: iface.address, interface: name };
            }
        }
    }
    return { ip: 'localhost', interface: '-' };
}

// Ambil nama WiFi/Network yang sedang terhubung
function getNetworkName() {
    try {
        const result = execSync('netsh wlan show interfaces', { encoding: 'utf8', timeout: 3000 });
        const match = result.match(/SSID\s+:\s*(.+)/i);
        if (match) return match[1].trim();
    } catch {}
    try {
        const result = execSync('netsh lan show interfaces', { encoding: 'utf8', timeout: 3000 });
        const match = result.match(/Name\s+:\s*(.+)/i);
        if (match) return match[1].trim();
    } catch {}
    return null;
}

const HOST = '0.0.0.0';
const { ip: localIP, interface: netInterface } = getLocalIP();
const networkName = getNetworkName();
const usePublic = process.argv.includes('--public');

app.listen(PORT, HOST, async () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║          WEB-FIS Server Running           ║');
    console.log('  ╠══════════════════════════════════════════╣');
    console.log(`  ║  Localhost   : http://localhost:${PORT}       ║`);
    console.log(`  ║  Network IP  : http://${localIP}:${PORT}  ║`);
    if (networkName) {
        console.log(`  ║  WiFi/Net    : ${networkName}`);
    }
    console.log(`  ║  Interface   : ${netInterface}`);
    console.log('  ╠══════════════════════════════════════════╣');
    console.log('  ║  Admin Login : NIM = ADMIN / Pass = admin123');
    console.log('  ╠══════════════════════════════════════════╣');

    if (usePublic) {
        try {
            console.log('  ║  Mode: PUBLIC (Cloudflare Tunnel...)     ║');
            console.log('  ╠══════════════════════════════════════════╣');

            const url = await new Promise((resolve, reject) => {
                const tunnel = spawn(cloudflared.bin, ['tunnel', '--url', `http://localhost:${PORT}`]);
                let output = '';

                tunnel.stdout.on('data', (data) => {
                    output += data.toString();
                    const match = output.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
                    if (match) resolve(match[1]);
                });

                tunnel.stderr.on('data', (data) => {
                    output += data.toString();
                    const match = output.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
                    if (match) resolve(match[1]);
                });

                tunnel.on('error', reject);
                setTimeout(() => reject(new Error('Timeout menunggu URL tunnel')), 30000);
            });

            console.log(`  ║  PUBLIC URL  : ${url}`);
            console.log('  ╠══════════════════════════════════════════╣');
            console.log('  ║  Siswa bisa akses dari WiFi/manapun!     ║');
            console.log('  ║  Kirim link di atas ke siswa.            ║');
            console.log('  ║  Tidak ada warning page!                 ║');
        } catch (err) {
            console.log(`  ║  Gagal membuat tunnel: ${err.message}`);
            console.log('  ║  Server tetap berjalan di local network. ');
        }
    } else {
        console.log('  ║  Mode: LOCAL (jaringan WiFi yang sama)   ║');
        console.log('  ╠══════════════════════════════════════════╣');
        console.log('  ║  Untuk mode PUBLIC (akses dari mana saja):║');
        console.log('  ║  npm run public                           ║');
        console.log('  ╠══════════════════════════════════════════╣');
        console.log('  ║  Cara akses dari HP:                     ║');
        console.log('  ║  1. Pastikan HP & laptop WiFi SAMA        ║');
        console.log(`  ║  2. Buka browser, ketik:                  ║`);
        console.log(`  ║     http://${localIP}:${PORT}         ║`);
    }

    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
});
