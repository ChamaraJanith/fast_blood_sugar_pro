# GlucoTracker - Comprehensive Glucose Monitoring System

A full-stack web application for monitoring and managing blood glucose levels with advanced features including PDF report processing, data visualization, and export capabilities.

## 🌟 Features

### Frontend
- **Dashboard**: Real-time glucose status and statistics
- **Data Entry**: Manual entry with validation and meal tags
- **PDF Scanner**: Upload and extract glucose values from medical reports
- **Text Processor**: Parse glucose readings from pasted medical text
- **Charts**: Multiple visualization types (trend, daily pattern, time in range)
- **Export**: CSV, JSON, and PDF report generation
- **Settings**: Customizable target ranges and preferences
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between themes

### Backend
- **RESTful API**: Full CRUD operations for glucose data
- **PDF Processing**: Automatic extraction of glucose values from medical reports
- **Text Analysis**: Pattern matching for FBS, glucose levels, HbA1c
- **Database**: SQLite database for data persistence
- **File Upload**: Secure PDF upload with validation
- **Statistics**: Real-time calculation of glucose statistics
- **Export**: Server-side CSV generation

## 🛠 Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Chart.js for data visualization
- PDF.js for client-side PDF processing
- Responsive CSS Grid and Flexbox
- Local Storage for data persistence

### Backend
- Node.js with Express.js
- SQLite database
- Multer for file uploads
- PDF-parse for server-side PDF processing
- CORS enabled for cross-origin requests

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Quick Start

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd glucose-meter-app
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Start the backend server**
   ```bash
   npm start
   ```

4. **Serve the frontend**
   ```bash
   cd ../frontend
   # Using Python (if available)
   python3 -m http.server 8080
   # OR using Node.js serve package
   npx serve . -p 8080
   ```

5. **Open your browser**
   Navigate to `http://localhost:8080`

### Using Docker (Optional)

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: `http://localhost:8080`
   - Backend API: `http://localhost:3000/api`

## 🚀 Usage

### Adding Glucose Data
1. **Manual Entry**: Use the "Add Data" section to manually enter readings
2. **PDF Upload**: Upload medical reports to automatically extract glucose values
3. **Text Processing**: Paste medical report text to extract readings

### Viewing Data
1. **Dashboard**: See current status and quick statistics
2. **Charts**: View trends, daily patterns, and time-in-range analysis
3. **Export**: Download data in various formats

### Configuration
1. **Settings**: Customize target glucose ranges
2. **Theme**: Switch between light and dark modes
3. **Units**: Configure preferred units (mg/dL or mmol/L)

## 📊 API Endpoints

### Glucose Readings
- `GET /api/glucose` - Get all glucose readings
- `POST /api/glucose` - Add new glucose reading
- `GET /api/stats` - Get glucose statistics

### Report Processing
- `POST /api/process-pdf` - Upload and process PDF report
- `POST /api/process-text` - Process text for glucose extraction

### Data Export
- `GET /api/export/csv` - Export data as CSV

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `DB_PATH`: SQLite database path
- `MAX_FILE_SIZE`: Maximum upload file size

### Target Ranges
Default glucose target ranges:
- **Normal**: 70-140 mg/dL
- **Low**: Below 70 mg/dL
- **High**: Above 140 mg/dL

## 📱 Mobile Support

The application is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones
- Progressive Web App capabilities

## 🔒 Security Features

- File upload validation (PDF only)
- Input sanitization
- SQL injection prevention
- File size limits
- CORS configuration

## 🧪 Sample Data

The application comes with sample glucose readings for testing and demonstration purposes.

## 📈 Chart Types

1. **Trend Chart**: Line chart showing glucose levels over time
2. **Daily Pattern**: 24-hour overlay chart showing typical daily patterns
3. **Time in Range**: Pie chart showing percentage of readings in target range
4. **Statistics**: Average, min, max glucose levels

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
1. Check the documentation
2. Review the API endpoints
3. Check browser console for errors
4. Ensure backend server is running

## 🔄 Updates

Stay updated with the latest features and improvements by checking the releases section.

---

**Note**: This application is for educational and personal use. Always consult healthcare professionals for medical decisions.
