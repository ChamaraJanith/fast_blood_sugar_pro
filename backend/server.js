const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdf = require('pdf-parse');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Create uploads directory if it doesn't exist
const createUploadsDir = async () => {
    try {
        await fs.mkdir('uploads', { recursive: true });
    } catch (error) {
        console.log('Uploads directory already exists or error creating:', error.message);
    }
};

// Initialize database
const initDB = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('glucose.db');

        db.serialize(() => {
            // Create patients table
            db.run(`CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                date_of_birth DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Create glucose_readings table
            db.run(`CREATE TABLE IF NOT EXISTS glucose_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER DEFAULT 1,
                glucose_level REAL NOT NULL,
                unit TEXT DEFAULT 'mg/dL',
                meal_tag TEXT,
                notes TEXT,
                timestamp DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients (id)
            )`);

            // Create reports table
            db.run(`CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER DEFAULT 1,
                filename TEXT,
                extracted_text TEXT,
                extracted_values TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients (id)
            )`);

            // Insert default patient if not exists
            db.run(`INSERT OR IGNORE INTO patients (id, name, email) VALUES (1, 'Default Patient', 'patient@example.com')`);
        });

        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Glucose extraction patterns
const fbsPatterns = [
    'FASTING PLASMA GLUCOSE',
    'FBS',
    'fasting blood sugar',
    'fasting glucose',
    'fasting blood glucose',
    'FPG',
    'Glucose, Fasting',
    'GLUCOSE FASTING'
];

const glucosePatterns = [
    /\b(\d+\.?\d*)\s*mg\/dL/gi,
    /\b(\d+\.?\d*)\s*mmol\/L/gi,
    /glucose\s*:?\s*(\d+\.?\d*)/gi,
    /FBS\s*:?\s*(\d+\.?\d*)/gi,
    /HbA1c\s*:?\s*(\d+\.?\d*)/gi
];

// Extract glucose values from text
const extractGlucoseFromText = (text) => {
    const results = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
        // Check for FBS patterns first
        const fbsFound = fbsPatterns.some(pattern => 
            line.toLowerCase().includes(pattern.toLowerCase())
        );

        if (fbsFound) {
            // Extract numeric values from this line and surrounding context
            const contextStart = Math.max(0, lineIndex - 2);
            const contextEnd = Math.min(lines.length - 1, lineIndex + 2);
            const context = lines.slice(contextStart, contextEnd + 1).join(' ');

            glucosePatterns.forEach(pattern => {
                const matches = [...context.matchAll(pattern)];
                matches.forEach(match => {
                    const value = parseFloat(match[1]);
                    if (value >= 30 && value <= 500) { // Reasonable glucose range
                        results.push({
                            value: value,
                            unit: match[0].includes('mmol') ? 'mmol/L' : 'mg/dL',
                            context: line.trim(),
                            line: lineIndex + 1
                        });
                    }
                });
            });
        }
    });

    return results;
};

// API Routes

// Get all glucose readings
app.get('/api/glucose', (req, res) => {
    const db = new sqlite3.Database('glucose.db');

    db.all(`SELECT * FROM glucose_readings ORDER BY timestamp DESC`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });

    db.close();
});

// Add glucose reading
app.post('/api/glucose', (req, res) => {
    const { glucose_level, unit, meal_tag, notes, timestamp } = req.body;

    if (!glucose_level || !timestamp) {
        return res.status(400).json({ error: 'glucose_level and timestamp are required' });
    }

    const db = new sqlite3.Database('glucose.db');

    db.run(`INSERT INTO glucose_readings (glucose_level, unit, meal_tag, notes, timestamp)
            VALUES (?, ?, ?, ?, ?)`,
        [glucose_level, unit || 'mg/dL', meal_tag, notes, timestamp],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({
                    id: this.lastID,
                    glucose_level,
                    unit,
                    meal_tag,
                    notes,
                    timestamp
                });
            }
        }
    );

    db.close();
});

// Process PDF and extract glucose values
app.post('/api/process-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const filePath = req.file.path;
        const dataBuffer = await fs.readFile(filePath);

        // Parse PDF
        const pdfData = await pdf(dataBuffer);
        const extractedText = pdfData.text;

        // Extract glucose values
        const glucoseValues = extractGlucoseFromText(extractedText);

        // Save to database
        const db = new sqlite3.Database('glucose.db');

        db.run(`INSERT INTO reports (filename, extracted_text, extracted_values)
                VALUES (?, ?, ?)`,
            [req.file.originalname, extractedText, JSON.stringify(glucoseValues)],
            function(err) {
                db.close();

                if (err) {
                    console.error('Database error:', err);
                }
            }
        );

        // Clean up uploaded file
        await fs.unlink(filePath);

        res.json({
            filename: req.file.originalname,
            extractedText,
            glucoseValues,
            success: true
        });

    } catch (error) {
        console.error('PDF processing error:', error);
        res.status(500).json({ error: 'Failed to process PDF: ' + error.message });
    }
});

// Process text and extract glucose values
app.post('/api/process-text', (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Extract glucose values
        const glucoseValues = extractGlucoseFromText(text);

        res.json({
            glucoseValues,
            success: true
        });

    } catch (error) {
        console.error('Text processing error:', error);
        res.status(500).json({ error: 'Failed to process text: ' + error.message });
    }
});

// Export data as CSV
app.get('/api/export/csv', (req, res) => {
    const db = new sqlite3.Database('glucose.db');

    db.all(`SELECT * FROM glucose_readings ORDER BY timestamp ASC`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Convert to CSV
        let csv = 'Date,Time,Glucose Level,Unit,Meal Tag,Notes\n';

        rows.forEach(row => {
            const date = new Date(row.timestamp);
            const dateStr = date.toISOString().split('T')[0];
            const timeStr = date.toISOString().split('T')[1].split('.')[0];

            csv += `"${dateStr}","${timeStr}","${row.glucose_level}","${row.unit}","${row.meal_tag || ''}","${row.notes || ''}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="glucose_data.csv"');
        res.send(csv);
    });

    db.close();
});

// Get statistics
app.get('/api/stats', (req, res) => {
    const db = new sqlite3.Database('glucose.db');

    db.all(`SELECT 
                COUNT(*) as total_readings,
                AVG(glucose_level) as average_glucose,
                MIN(glucose_level) as min_glucose,
                MAX(glucose_level) as max_glucose,
                COUNT(CASE WHEN glucose_level BETWEEN 70 AND 140 THEN 1 END) as normal_readings
            FROM glucose_readings`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const stats = rows[0];
            stats.time_in_range = stats.total_readings > 0 ? 
                (stats.normal_readings / stats.total_readings * 100).toFixed(1) : 0;
            res.json(stats);
        }
    });

    db.close();
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }

    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
    try {
        await createUploadsDir();
        await initDB();

        app.listen(PORT, () => {
            console.log(`🚀 Glucose Meter Server running on port ${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}`);
            console.log(`🔗 API: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
