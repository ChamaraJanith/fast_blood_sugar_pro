// Global variables
let glucoseData = [];
let charts = {};
let settings = {
    normalMin: 70,
    normalMax: 140,
    unit: 'mg/dL',
    theme: 'auto'
};

// Sample data for initialization
const sampleData = [
    {"id": 1, "timestamp": "2024-08-27T07:30:00", "glucose": 95, "unit": "mg/dL", "mealTag": "Fasting", "notes": ""},
    {"id": 2, "timestamp": "2024-08-27T09:15:00", "glucose": 142, "unit": "mg/dL", "mealTag": "Post-meal", "notes": "After breakfast"},
    {"id": 3, "timestamp": "2024-08-27T12:30:00", "glucose": 118, "unit": "mg/dL", "mealTag": "Pre-meal", "notes": ""},
    {"id": 4, "timestamp": "2024-08-27T14:45:00", "glucose": 156, "unit": "mg/dL", "mealTag": "Post-meal", "notes": "After lunch"},
    {"id": 5, "timestamp": "2024-08-27T19:20:00", "glucose": 134, "unit": "mg/dL", "mealTag": "Post-meal", "notes": "After dinner"},
    {"id": 6, "timestamp": "2024-08-27T22:10:00", "glucose": 108, "unit": "mg/dL", "mealTag": "Bedtime", "notes": ""}
];

// Glucose extraction patterns
const fbsPatterns = ["FASTING PLASMA GLUCOSE", "FBS", "fasting blood sugar", "fasting glucose", "fasting blood glucose", "FPG", "Glucose, Fasting", "GLUCOSE FASTING"];
const glucosePatterns = [
    /\b(\d+\.?\d*)\s*mg\/dL/gi,
    /\b(\d+\.?\d*)\s*mmol\/L/gi,
    /glucose\s*:?\s*(\d+\.?\d*)/gi,
    /FBS\s*:?\s*(\d+\.?\d*)/gi,
    /HbA1c\s*:?\s*(\d+\.?\d*)/gi
];

// Initialize PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initializeEventListeners();
    updateDashboard();
    setCurrentDateTime();
    initializeTheme();

    // Load sample data if no data exists
    if (glucoseData.length === 0) {
        glucoseData = sampleData.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).toISOString()
        }));
        saveData();
        updateDashboard();
    }
});

document.getElementById('runBatchBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/run-batch', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            alert('Batch file executed successfully!\n' + data.output);
        } else {
            alert('Error running batch file:\n' + data.error);
        }
    } catch (err) {
        alert('Failed to connect to batch API');
        console.error(err);
    }
});


// Event Listeners
function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showSection(section);
        });
    });

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Form submission
    const glucoseForm = document.getElementById('glucoseForm');
    if (glucoseForm) {
        glucoseForm.addEventListener('submit', handleGlucoseSubmit);
    }

    // PDF upload
    const pdfInput = document.getElementById('pdfInput');
    const browsePdf = document.getElementById('browsePdf');
    const pdfUploadArea = document.getElementById('pdfUploadArea');

    if (pdfInput && browsePdf && pdfUploadArea) {
        browsePdf.addEventListener('click', () => pdfInput.click());
        pdfInput.addEventListener('change', handlePDFUpload);

        // Drag and drop
        pdfUploadArea.addEventListener('dragover', handleDragOver);
        pdfUploadArea.addEventListener('dragleave', handleDragLeave);
        pdfUploadArea.addEventListener('drop', handlePDFDrop);
    }

    // Text scanning
    const scanText = document.getElementById('scanText');
    const clearText = document.getElementById('clearText');

    if (scanText) {
        scanText.addEventListener('click', handleTextScan);
    }

    if (clearText) {
        clearText.addEventListener('click', () => {
            document.getElementById('medicalText').value = '';
            document.getElementById('textResults').style.display = 'none';
        });
    }

    // Chart controls
    const chartType = document.getElementById('chartType');
    const dateRange = document.getElementById('dateRange');

    if (chartType) {
        chartType.addEventListener('change', updateChart);
    }

    if (dateRange) {
        dateRange.addEventListener('change', updateChart);
    }

    // Export buttons
    document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const format = e.currentTarget.dataset.format;
            exportData(format);
        });
    });

    // Settings
    const saveRanges = document.getElementById('saveRanges');
    if (saveRanges) {
        saveRanges.addEventListener('click', saveSettings);
    }

    // Data management
    const backupData = document.getElementById('backupData');
    const importData = document.getElementById('importData');
    const clearAllData = document.getElementById('clearAllData');
    const importFile = document.getElementById('importFile');

    if (backupData) {
        backupData.addEventListener('click', () => exportData('json'));
    }

    if (importData && importFile) {
        importData.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', handleDataImport);
    }

    if (clearAllData) {
        clearAllData.addEventListener('click', handleClearAllData);
    }
}

// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    const targetButton = document.querySelector(`[data-section="${sectionId}"]`);

    if (targetSection) {
        targetSection.classList.add('active');
    }

    if (targetButton) {
        targetButton.classList.add('active');
    }

    // Update chart if charts section is shown
    if (sectionId === 'charts') {
        setTimeout(updateChart, 100);
    }
}

// Data Management
function loadData() {
    const saved = localStorage.getItem('glucoseData');
    if (saved) {
        try {
            glucoseData = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading data:', e);
            glucoseData = [];
        }
    }

    const savedSettings = localStorage.getItem('glucoseSettings');
    if (savedSettings) {
        try {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
}

function saveData() {
    try {
        localStorage.setItem('glucoseData', JSON.stringify(glucoseData));
        localStorage.setItem('glucoseSettings', JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving data:', e);
        showStatus('Error saving data. Storage may be full.', 'error');
    }
}

// Dashboard Updates
function updateDashboard() {
    updateCurrentGlucose();
    updateStats();
    updateRecentReadings();
}

function updateCurrentGlucose() {
    const currentGlucoseEl = document.getElementById('currentGlucose');
    const glucoseStatusEl = document.getElementById('glucoseStatus');
    const lastReadingEl = document.getElementById('lastReading');

    if (!currentGlucoseEl || !glucoseStatusEl || !lastReadingEl) return;

    if (glucoseData.length === 0) {
        currentGlucoseEl.textContent = '--';
        glucoseStatusEl.textContent = 'No data';
        lastReadingEl.textContent = '--';
        return;
    }

    // Get most recent reading
    const sortedData = [...glucoseData].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    const latest = sortedData[0];

    currentGlucoseEl.textContent = latest.glucose;

    // Determine status
    let status = 'Normal';
    if (latest.glucose < settings.normalMin) {
        status = 'Low';
    } else if (latest.glucose > settings.normalMax) {
        status = 'High';
    }

    glucoseStatusEl.textContent = status;

    // Format last reading time
    const readingTime = new Date(latest.timestamp);
    const now = new Date();
    const diffMs = now - readingTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let timeStr = '';
    if (diffHours > 0) {
        timeStr = `${diffHours}h ${diffMins}m ago`;
    } else {
        timeStr = `${diffMins}m ago`;
    }

    lastReadingEl.textContent = `Last reading: ${timeStr}`;
}

function updateStats() {
    const avgGlucoseEl = document.getElementById('avgGlucose');
    const timeInRangeEl = document.getElementById('timeInRange');
    const totalReadingsEl = document.getElementById('totalReadings');
    const lastWeekAvgEl = document.getElementById('lastWeekAvg');

    if (glucoseData.length === 0) {
        if (avgGlucoseEl) avgGlucoseEl.textContent = '--';
        if (timeInRangeEl) timeInRangeEl.textContent = '--%';
        if (totalReadingsEl) totalReadingsEl.textContent = '--';
        if (lastWeekAvgEl) lastWeekAvgEl.textContent = '--';
        return;
    }

    // Calculate overall average
    const totalGlucose = glucoseData.reduce((sum, reading) => sum + reading.glucose, 0);
    const avgGlucose = Math.round(totalGlucose / glucoseData.length);

    // Calculate time in range
    const inRangeCount = glucoseData.filter(reading => 
        reading.glucose >= settings.normalMin && reading.glucose <= settings.normalMax
    ).length;
    const timeInRange = Math.round((inRangeCount / glucoseData.length) * 100);

    // Calculate last week average
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekData = glucoseData.filter(reading => 
        new Date(reading.timestamp) >= lastWeek
    );

    let lastWeekAvg = '--';
    if (lastWeekData.length > 0) {
        const lastWeekTotal = lastWeekData.reduce((sum, reading) => sum + reading.glucose, 0);
        lastWeekAvg = Math.round(lastWeekTotal / lastWeekData.length);
    }

    // Update UI
    if (avgGlucoseEl) avgGlucoseEl.textContent = avgGlucose;
    if (timeInRangeEl) timeInRangeEl.textContent = timeInRange + '%';
    if (totalReadingsEl) totalReadingsEl.textContent = glucoseData.length;
    if (lastWeekAvgEl) lastWeekAvgEl.textContent = lastWeekAvg;
}

function updateRecentReadings() {
    const recentReadingsEl = document.getElementById('recentReadings');
    if (!recentReadingsEl) return;

    if (glucoseData.length === 0) {
        recentReadingsEl.innerHTML = '<p class="no-data">No readings available. Add your first reading!</p>';
        return;
    }

    // Get last 5 readings
    const sortedData = [...glucoseData].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, 5);

    const html = sortedData.map(reading => {
        const date = new Date(reading.timestamp);
        const timeStr = date.toLocaleString();

        let statusClass = 'reading-normal';
        if (reading.glucose < settings.normalMin) {
            statusClass = 'reading-low';
        } else if (reading.glucose > settings.normalMax) {
            statusClass = 'reading-high';
        }

        return `
            <div class="reading-item">
                <div class="reading-value ${statusClass}">
                    ${reading.glucose} ${reading.unit}
                </div>
                <div class="reading-info">
                    <div class="reading-time">${timeStr}</div>
                    ${reading.mealTag ? `<div class="reading-tag">${reading.mealTag}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    recentReadingsEl.innerHTML = html;
}

// Form Handling
function setCurrentDateTime() {
    const dateTimeInput = document.getElementById('glucoseDateTime');
    if (dateTimeInput) {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        dateTimeInput.value = localDateTime.toISOString().slice(0, 16);
    }
}

function handleGlucoseSubmit(e) {
    e.preventDefault();

    const glucose = parseFloat(document.getElementById('glucoseValue').value);
    const unit = document.getElementById('glucoseUnit').value;
    const dateTime = document.getElementById('glucoseDateTime').value;
    const mealTag = document.getElementById('mealTag').value;
    const notes = document.getElementById('glucoseNotes').value;

    if (!glucose || !dateTime) {
        showStatus('Please fill in all required fields', 'error');
        return;
    }

    if (glucose < 30 || glucose > 500) {
        showStatus('Glucose value must be between 30 and 500', 'error');
        return;
    }

    // Add new reading
    const newReading = {
        id: Date.now(),
        glucose: glucose,
        unit: unit,
        timestamp: new Date(dateTime).toISOString(),
        mealTag: mealTag,
        notes: notes
    };

    glucoseData.unshift(newReading);
    saveData();
    updateDashboard();

    // Reset form
    e.target.reset();
    setCurrentDateTime();

    showStatus('Glucose reading added successfully!', 'success');
}

// PDF Processing
function handlePDFUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processPDF(file);
    }
}

function handlePDFDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        processPDF(file);
    } else {
        showStatus('Please drop a PDF file', 'error');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

async function processPDF(file) {
    if (!pdfjsLib) {
        showStatus('PDF processing not available', 'error');
        return;
    }

    showLoading('Processing PDF...');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        const extractedValues = extractGlucoseFromText(fullText);
        displayPDFResults(file.name, extractedValues, fullText);

        hideLoading();
        showStatus(`Extracted ${extractedValues.length} glucose values from PDF`, 'success');

    } catch (error) {
        hideLoading();
        console.error('PDF processing error:', error);
        showStatus('Error processing PDF file', 'error');
    }
}

function displayPDFResults(filename, values, fullText) {
    const resultsEl = document.getElementById('pdfResults');
    const extractedValuesEl = document.getElementById('extractedValues');

    if (!resultsEl || !extractedValuesEl) return;

    if (values.length === 0) {
        extractedValuesEl.innerHTML = '<p class="no-data">No glucose values found in this PDF</p>';
    } else {
        const html = values.map((value, index) => `
            <div class="extracted-value" data-index="${index}">
                <div class="value-main">
                    <strong>${value.value} ${value.unit}</strong>
                    <button class="btn btn--primary btn--sm" onclick="addExtractedValue(${index}, ${JSON.stringify(value).replace(/"/g, '&quot;')})">
                        Add Reading
                    </button>
                </div>
                <div class="value-context">${value.context}</div>
            </div>
        `).join('');

        extractedValuesEl.innerHTML = html;
    }

    resultsEl.style.display = 'block';
}

// Text Processing
function handleTextScan() {
    const textArea = document.getElementById('medicalText');
    const text = textArea.value.trim();

    if (!text) {
        showStatus('Please enter some text to scan', 'error');
        return;
    }

    setButtonLoading('scanText', true);

    // Simulate processing delay
    setTimeout(() => {
        const extractedValues = extractGlucoseFromText(text);
        displayTextResults(extractedValues);
        setButtonLoading('scanText', false);

        if (extractedValues.length > 0) {
            showStatus(`Found ${extractedValues.length} glucose values`, 'success');
        } else {
            showStatus('No glucose values found in the text', 'info');
        }
    }, 500);
}

function extractGlucoseFromText(text) {
    const results = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
        // Check for FBS patterns
        const fbsFound = fbsPatterns.some(pattern => 
            line.toLowerCase().includes(pattern.toLowerCase())
        );

        if (fbsFound || line.toLowerCase().includes('glucose')) {
            // Extract numeric values
            glucosePatterns.forEach(pattern => {
                const matches = [...line.matchAll(pattern)];
                matches.forEach(match => {
                    const value = parseFloat(match[1]);
                    if (value >= 30 && value <= 500) {
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
}

function displayTextResults(values) {
    const resultsEl = document.getElementById('textResults');
    const foundValuesEl = document.getElementById('foundValues');

    if (!resultsEl || !foundValuesEl) return;

    if (values.length === 0) {
        foundValuesEl.innerHTML = '<p class="no-data">No glucose values found in this text</p>';
    } else {
        const html = values.map((value, index) => `
            <div class="extracted-value" data-index="${index}">
                <div class="value-main">
                    <strong>${value.value} ${value.unit}</strong>
                    <button class="btn btn--primary btn--sm" onclick="addExtractedValue(${index}, ${JSON.stringify(value).replace(/"/g, '&quot;')})">
                        Add Reading
                    </button>
                </div>
                <div class="value-context">Line ${value.line}: ${value.context}</div>
            </div>
        `).join('');

        foundValuesEl.innerHTML = html;
    }

    resultsEl.style.display = 'block';
}

function addExtractedValue(index, value) {
    const newReading = {
        id: Date.now(),
        glucose: value.value,
        unit: value.unit,
        timestamp: new Date().toISOString(),
        mealTag: 'Fasting', // Default for extracted values
        notes: `Extracted from: ${value.context.substring(0, 100)}...`
    };

    glucoseData.unshift(newReading);
    saveData();
    updateDashboard();

    showStatus('Glucose reading added from extracted data!', 'success');

    // Remove the extracted value from display
    const valueElement = document.querySelector(`[data-index="${index}"]`);
    if (valueElement) {
        valueElement.style.opacity = '0.5';
        valueElement.querySelector('button').disabled = true;
        valueElement.querySelector('button').textContent = 'Added';
    }
}

// Chart Functions
async function prepareChartCanvas() {
    const chartCanvas = document.getElementById('mainChart');
    if (!chartCanvas) {
        console.warn('Chart canvas not found');
        return false;
    }

    // Make sure charts section is active
    const chartsSection = document.getElementById('charts');
    if (chartsSection) {
        chartsSection.classList.add('active');
    }

    // Set canvas dimensions
    chartCanvas.style.width = '800px';
    chartCanvas.style.height = '400px';
    chartCanvas.style.display = 'block';

    // Wait for chart to be visible
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update chart to ensure it's rendered
    if (charts.main) {
        charts.main.update();
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return true;
}

function updateChart() {
    const chartType = document.getElementById('chartType').value;
    const dateRange = document.getElementById('dateRange').value;

    const canvas = document.getElementById('mainChart');
    if (!canvas) return;

    // Destroy existing chart
    if (charts.main) {
        charts.main.destroy();
    }

    // Filter data by date range
    let filteredData = [...glucoseData];
    if (dateRange !== 'custom') {
        const days = parseInt(dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filteredData = glucoseData.filter(reading => 
            new Date(reading.timestamp) >= cutoffDate
        );
    }

    // Sort by timestamp
    filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const ctx = canvas.getContext('2d');

    switch (chartType) {
        case 'trend':
            charts.main = createTrendChart(ctx, filteredData);
            break;
        case 'daily':
            charts.main = createDailyPatternChart(ctx, filteredData);
            break;
        case 'range':
            charts.main = createTimeInRangeChart(ctx, filteredData);
            break;
    }

    updateChartStats(filteredData);
}

function createTrendChart(ctx, data) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(reading => 
                new Date(reading.timestamp).toLocaleDateString()
            ),
            datasets: [{
                label: 'Glucose Level',
                data: data.map(reading => reading.glucose),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Glucose (mg/dL)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const reading = data[context.dataIndex];
                            return `${reading.glucose} ${reading.unit} (${reading.mealTag || 'No tag'})`;
                        }
                    }
                }
            }
        }
    });
}

function createDailyPatternChart(ctx, data) {
    // Group data by hour of day
    const hourlyData = {};

    data.forEach(reading => {
        const hour = new Date(reading.timestamp).getHours();
        if (!hourlyData[hour]) {
            hourlyData[hour] = [];
        }
        hourlyData[hour].push(reading.glucose);
    });

    // Calculate averages for each hour
    const labels = [];
    const averages = [];

    for (let hour = 0; hour < 24; hour++) {
        labels.push(`${hour}:00`);
        if (hourlyData[hour]) {
            const avg = hourlyData[hour].reduce((sum, val) => sum + val, 0) / hourlyData[hour].length;
            averages.push(Math.round(avg));
        } else {
            averages.push(null);
        }
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Glucose by Hour',
                data: averages,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Average Glucose (mg/dL)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hour of Day'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createTimeInRangeChart(ctx, data) {
    if (data.length === 0) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e5e7eb']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    const lowCount = data.filter(r => r.glucose < settings.normalMin).length;
    const normalCount = data.filter(r => 
        r.glucose >= settings.normalMin && r.glucose <= settings.normalMax
    ).length;
    const highCount = data.filter(r => r.glucose > settings.normalMax).length;

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Low', 'Normal', 'High'],
            datasets: [{
                data: [lowCount, normalCount, highCount],
                backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = lowCount + normalCount + highCount;
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} readings (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChartStats(data) {
    const periodReadingsEl = document.getElementById('periodReadings');
    const periodAverageEl = document.getElementById('periodAverage');
    const periodTIREl = document.getElementById('periodTIR');

    if (!periodReadingsEl || !periodAverageEl || !periodTIREl) return;

    if (data.length === 0) {
        periodReadingsEl.textContent = '0';
        periodAverageEl.textContent = '--';
        periodTIREl.textContent = '--%';
        return;
    }

    const total = data.reduce((sum, reading) => sum + reading.glucose, 0);
    const average = Math.round(total / data.length);

    const inRange = data.filter(reading => 
        reading.glucose >= settings.normalMin && reading.glucose <= settings.normalMax
    ).length;
    const tir = Math.round((inRange / data.length) * 100);

    periodReadingsEl.textContent = data.length;
    periodAverageEl.textContent = `${average} mg/dL`;
    periodTIREl.textContent = `${tir}%`;
}

// Export Functions
function exportData(format) {
    if (glucoseData.length === 0) {
        showStatus('No data to export', 'error');
        return;
    }

    switch (format) {
        case 'csv':
            exportCSV();
            break;
        case 'json':
            exportJSON();
            break;
        case 'pdf':
            exportPDF();
            break;
    }
}

function exportCSV() {
    const headers = ['Date', 'Time', 'Glucose Level', 'Unit', 'Meal Tag', 'Notes'];
    const csvData = [headers];

    const sortedData = [...glucoseData].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    sortedData.forEach(reading => {
        const date = new Date(reading.timestamp);
        const row = [
            date.toISOString().split('T')[0],
            date.toTimeString().split(' ')[0],
            reading.glucose,
            reading.unit,
            reading.mealTag || '',
            reading.notes || ''
        ];
        csvData.push(row);
    });

    const csvContent = csvData.map(row => 
        row.map(field => `"${field}"`).join(',')
    ).join('\n');

    downloadFile(csvContent, 'glucose-data.csv', 'text/csv');
    showStatus('CSV file downloaded successfully!', 'success');
}

function exportJSON() {
    const exportData = {
        exportDate: new Date().toISOString(),
        settings: settings,
        data: glucoseData
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'glucose-backup.json', 'application/json');
    showStatus('JSON backup downloaded successfully!', 'success');
}

function exportPDF() {
    // This would require a PDF library like jsPDF
    showStatus('PDF export feature coming soon!', 'info');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// Settings Functions
function saveSettings() {
    const normalMin = parseFloat(document.getElementById('normalMin').value);
    const normalMax = parseFloat(document.getElementById('normalMax').value);
    const defaultUnit = document.getElementById('defaultUnit').value;

    if (normalMin >= normalMax) {
        showStatus('Minimum value must be less than maximum value', 'error');
        return;
    }

    settings.normalMin = normalMin;
    settings.normalMax = normalMax;
    settings.unit = defaultUnit;

    saveData();
    updateDashboard();
    showStatus('Settings saved successfully!', 'success');
}

function handleDataImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);

            if (importData.data && Array.isArray(importData.data)) {
                glucoseData = importData.data;
                if (importData.settings) {
                    settings = { ...settings, ...importData.settings };
                }

                saveData();
                updateDashboard();
                showStatus(`Imported ${glucoseData.length} glucose readings!`, 'success');
            } else {
                showStatus('Invalid file format', 'error');
            }
        } catch (error) {
            showStatus('Error importing data: ' + error.message, 'error');
        }
    };

    reader.readAsText(file);
}

function handleClearAllData() {
    const normalMin = parseFloat(document.getElementById('normalMin').value);
    const normalMax = parseFloat(document.getElementById('normalMax').value);

    if (normalMin >= normalMax) {
        showStatus('Minimum value must be less than maximum value', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete all glucose data? This cannot be undone.')) {
        glucoseData = [];
        saveData();
        updateDashboard();
        showStatus('All data has been cleared', 'success');
    }
}

// Theme Functions
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function applyTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌓';
    }
}

// Utility Functions
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.classList.remove('hidden');

    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 4000);
}

function showLoading(message = 'Loading...') {
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) {
        loadingEl.querySelector('p').textContent = message;
        loadingEl.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

function setButtonLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');

    if (isLoading) {
        btn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline';
    } else {
        btn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoading) btnLoading.style.display = 'none';
    }
}

// Initialize Chart.js defaults
if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
}

class FBSExtractor {
    constructor() {
        this.fbsPatterns = [
            'FASTING PLASMA GLUCOSE', 'FBS', 'fasting blood sugar', 
            'fasting glucose', 'fasting blood glucose', 'FPG'
        ];
        this.normalRanges = {
            'mg_dl': '70-100 mg/dL',
            'mmol_l': '3.9-5.5 mmol/L'
        };
        this.extractedData = [];
        this.summaryStats = {};
        this.chartInstance = null;
        this.init();
    }

    // ... existing methods ...

    // Enhanced method to calculate summary statistics
    calculateSummaryStats() {
        if (this.extractedData.length === 0) return;

        const allValues = [];
        this.extractedData.forEach(entry => {
            entry.numericValues.forEach(val => {
                const numValue = parseFloat(val.value);
                if (!isNaN(numValue)) {
                    allValues.push({
                        value: numValue,
                        unit: val.unit,
                        entry: entry
                    });
                }
            });
        });

        if (allValues.length === 0) return;

        // Group by unit for better analysis
        const valuesByUnit = {};
        allValues.forEach(item => {
            const unit = item.unit.toLowerCase();
            if (!valuesByUnit[unit]) valuesByUnit[unit] = [];
            valuesByUnit[unit].push(item.value);
        });

        this.summaryStats = {};
        Object.keys(valuesByUnit).forEach(unit => {
            const values = valuesByUnit[unit];
            const sortedValues = [...values].sort((a, b) => a - b);
            
            this.summaryStats[unit] = {
                count: values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                median: sortedValues[Math.floor(sortedValues.length / 2)],
                values: values,
                unit: unit
            };
        });

        this.generateChart();
    }

    // Generate chart using Chart.js
    generateChart() {
        const canvas = document.getElementById('fbsChart');
        if (!canvas) {
            // Create canvas if it doesn't exist
            const chartContainer = document.createElement('div');
            chartContainer.innerHTML = `
                <canvas id="fbsChart" width="400" height="200"></canvas>
            `;
            document.getElementById('results-content').appendChild(chartContainer);
        }

        const ctx = document.getElementById('fbsChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Prepare data for the chart
        const chartData = this.prepareChartData();

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Fasting Blood Sugar Values',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Glucose Level (mg/dL)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Entries'
                        }
                    }
                }
            }
        });
    }

    prepareChartData() {
        const primaryUnit = Object.keys(this.summaryStats)[0];
        const stats = this.summaryStats[primaryUnit];
        
        const labels = stats.values.map((_, index) => `Entry ${index + 1}`);
        const backgroundColors = stats.values.map(value => {
            if (value >= 70 && value <= 100) return '#22C55E'; // Green - Normal
            if (value < 70) return '#EF4444'; // Red - Low
            return '#F59E0B'; // Orange - High
        });

        return {
            labels: labels,
            datasets: [{
                label: `FBS Values (${stats.unit})`,
                data: stats.values,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color + '80'),
                borderWidth: 1
            }]
        };
    }

    // Enhanced display results with summary
    displayResults() {
        this.calculateSummaryStats();
        
        const summaryEl = document.getElementById('results-summary');
        const contentEl = document.getElementById('results-content');
        
        if (!summaryEl || !contentEl) return;

        if (this.extractedData.length === 0) {
            summaryEl.innerHTML = `
                <div class="no-results">
                    <p>No FBS data found in the scanned text.</p>
                </div>
            `;
            contentEl.innerHTML = '';
            this.showResults();
            return;
        }

        // Display summary statistics
        const primaryUnit = Object.keys(this.summaryStats)[0];
        const stats = this.summaryStats[primaryUnit];
        
        summaryEl.innerHTML = `
            <div class="summary-stats">
                <h3>📊 FBS Analysis Summary</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Total Entries:</span>
                        <span class="stat-value">${stats.count}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Average:</span>
                        <span class="stat-value">${stats.mean.toFixed(1)} ${stats.unit}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range:</span>
                        <span class="stat-value">${stats.min} - ${stats.max} ${stats.unit}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Median:</span>
                        <span class="stat-value">${stats.median} ${stats.unit}</span>
                    </div>
                </div>
                <div class="normal-range">
                    <p><strong>Normal Range:</strong> ${this.normalRanges.mg_dl}</p>
                </div>
            </div>
        `;

        // Display detailed results
        contentEl.innerHTML = this.extractedData.map((entry, index) => `
            <div class="fbs-entry">
                <h4>📄 Entry ${index + 1}: ${entry.matchedPattern}</h4>
                <div class="context-text">${entry.contextText.replace(new RegExp(entry.matchedText, 'gi'), `<span class="highlight">${entry.matchedText}</span>`)}</div>
                ${entry.numericValues.length > 0 ? `
                    <div class="extracted-values">
                        <strong>Extracted Values:</strong>
                        ${entry.numericValues.map(val => `<span class="value-item">${val.value} ${val.unit}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Add chart container
        contentEl.innerHTML += `
            <div class="chart-container">
                <canvas id="fbsChart" width="400" height="200"></canvas>
            </div>
        `;

        this.showResults();
    }

    // Generate PDF Report
    async generatePDFReport() {
        if (this.extractedData.length === 0) {
            this.showStatus('No data available to generate PDF report', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // PDF Header
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('FBS Analysis Report', 20, 30);
            
            // Date and time
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            const now = new Date();
            pdf.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, 45);
            
            let yPos = 65;
            
            // Summary Statistics
            if (Object.keys(this.summaryStats).length > 0) {
                const primaryUnit = Object.keys(this.summaryStats)[0];
                const stats = this.summaryStats[primaryUnit];
                
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Summary Statistics', 20, yPos);
                yPos += 15;
                
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                const summaryLines = [
                    `Total Entries: ${stats.count}`,
                    `Average Value: ${stats.mean.toFixed(1)} ${stats.unit}`,
                    `Range: ${stats.min} - ${stats.max} ${stats.unit}`,
                    `Median: ${stats.median} ${stats.unit}`,
                    `Normal Range: ${this.normalRanges.mg_dl}`
                ];
                
                summaryLines.forEach(line => {
                    pdf.text(line, 25, yPos);
                    yPos += 10;
                });
                
                yPos += 10;
            }

            // Add chart image
            if (this.chartInstance) {
                const chartCanvas = document.getElementById('fbsChart');
                const chartImageData = chartCanvas.toDataURL('image/png');
                
                pdf.addImage(chartImageData, 'PNG', 20, yPos, 170, 85);
                yPos += 100;
            }

            // Detailed Entries
            if (yPos > 200) {
                pdf.addPage();
                yPos = 30;
            }
            
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Detailed Entries', 20, yPos);
            yPos += 20;
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            
            this.extractedData.forEach((entry, index) => {
                if (yPos > 250) {
                    pdf.addPage();
                    yPos = 30;
                }
                
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Entry ${index + 1}: ${entry.matchedPattern}`, 20, yPos);
                yPos += 10;
                
                pdf.setFont('helvetica', 'normal');
                if (entry.numericValues.length > 0) {
                    const valuesText = entry.numericValues.map(val => `${val.value} ${val.unit}`).join(', ');
                    pdf.text(`Values: ${valuesText}`, 25, yPos);
                    yPos += 8;
                }
                
                // Context (truncated for space)
                const contextLines = pdf.splitTextToSize(entry.contextText.substring(0, 200) + '...', 160);
                contextLines.slice(0, 3).forEach(line => {
                    pdf.text(line, 25, yPos);
                    yPos += 6;
                });
                
                yPos += 10;
            });

            // Save the PDF
            const fileName = `FBS_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            
            this.showStatus('PDF report generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showStatus('Failed to generate PDF report', 'error');
        }
    }

    // Enhanced export functionality
    exportData() {
        // Create dropdown for export options
        const exportOptions = document.createElement('div');
        exportOptions.className = 'export-options';
        exportOptions.innerHTML = `
            <div class="export-dropdown">
                <button class="btn btn--primary" onclick="fbsExtractor.generatePDFReport()">
                    📄 Generate PDF Report
                </button>
                <button class="btn btn--secondary" onclick="fbsExtractor.exportCSV()">
                    📊 Export CSV
                </button>
                <button class="btn btn--secondary" onclick="fbsExtractor.exportJSON()">
                    📋 Export JSON
                </button>
            </div>
        `;
        
        const exportSection = document.querySelector('.export-section');
        if (exportSection && !exportSection.querySelector('.export-options')) {
            exportSection.appendChild(exportOptions);
        }
    }

    // Export as CSV
    exportCSV() {
        const csvData = ['Entry,Pattern,Value,Unit,Line,Context'];
        
        this.extractedData.forEach((entry, index) => {
            entry.numericValues.forEach(val => {
                const row = [
                    index + 1,
                    `"${entry.matchedPattern}"`,
                    val.value,
                    `"${val.unit}"`,
                    entry.lineNumber,
                    `"${entry.contextText.replace(/"/g, '""')}"`
                ].join(',');
                csvData.push(row);
            });
        });

        this.downloadFile(csvData.join('\n'), 'fbs_data.csv', 'text/csv');
        this.showStatus('CSV file exported successfully!', 'success');
    }

    // Export as JSON
    exportJSON() {
        const jsonData = {
            timestamp: new Date().toISOString(),
            summary: this.summaryStats,
            entries: this.extractedData,
            normalRanges: this.normalRanges
        };

        this.downloadFile(JSON.stringify(jsonData, null, 2), 'fbs_data.json', 'application/json');
        this.showStatus('JSON file exported successfully!', 'success');
    }

    // Helper method to download files
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
