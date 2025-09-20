# AI Debt Management Coach 🤖💰

An intelligent, AI-powered debt management application that helps users track their debts and provides personalized financial coaching using Google's Gemini AI. Get smart recommendations on debt repayment strategies, understand the difference between Snowball and Avalanche methods, and receive tailored advice based on your specific financial situation.

## 🎯 Project Vision

The AI Debt Management Coach aims to democratize financial literacy and debt management by providing:

- **Personalized AI Coaching**: Get tailored advice from an AI that understands your specific debt situation
- **Educational Approach**: Learn about proven debt repayment strategies (Snowball vs Avalanche methods)
- **User-Friendly Interface**: Simple, intuitive design that makes debt management accessible to everyone
- **Data-Driven Insights**: Analyze your debt portfolio and get actionable recommendations
- **Privacy-First**: All data processing happens locally with no permanent storage of personal financial information

## 🚀 Key Features

### 💬 AI-Powered Debt Coaching
- Interactive chat interface with Google Gemini AI
- Personalized advice based on your debt portfolio
- Explains debt repayment strategies (Snowball vs Avalanche)
- Analyzes impact of extra payments
- Provides encouragement and motivation

### 📊 Debt Management
- Add and track multiple debts with detailed information
- Monitor balances, APR rates, and minimum payments
- Visual debt portfolio overview
- CSV export functionality for record keeping
- Clear all debts feature with confirmation

### 🎨 Modern User Experience
- Responsive, glass-morphism design
- Smooth animations and transitions
- Accessible interface with ARIA support
- Real-time error handling and validation
- Loading indicators and user feedback

### 🛡️ Safety & Security
- Content filtering and safety settings
- Input validation and sanitization
- No permanent data storage (privacy-focused)
- CORS protection and secure API handling

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **Google Generative AI** - Gemini AI integration for intelligent coaching
- **Day.js** - Modern date/time manipulation
- **Papa Parse** - CSV generation and parsing
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend
- **Vanilla JavaScript** - Pure JS for optimal performance
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables and glass-morphism effects
- **Google Fonts** - Poppins font family for typography

### Development
- **ES6 Modules** - Modern JavaScript module system
- **npm** - Package management
- **Nodemon** - Development server with hot reload

## 🏆 Technical Achievements

### 🤖 AI Integration
- **Advanced Prompt Engineering**: Sophisticated prompts that ensure the AI provides relevant, safe, and helpful financial advice
- **Context-Aware Responses**: AI considers user's entire debt portfolio when providing recommendations
- **Safety Filtering**: Comprehensive content filtering to ensure appropriate financial guidance
- **Extra Payment Detection**: Smart regex parsing to detect and analyze extra payment scenarios

### 💻 Frontend Engineering
- **Vanilla JS Architecture**: Built without frameworks for optimal performance and minimal dependencies
- **Responsive Design**: Fully responsive layout that works across all device sizes
- **Real-time UI Updates**: Dynamic DOM manipulation with smooth user interactions
- **Error Handling**: Comprehensive client-side error handling with user-friendly messages
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

### 🏗️ Backend Architecture
- **RESTful API Design**: Clean, intuitive API endpoints for debt management operations
- **In-Memory Storage**: Lightweight data management suitable for demo and development
- **Express Middleware**: Proper use of CORS, JSON parsing, and static file serving
- **Error Management**: Structured error handling with appropriate HTTP status codes

### 🎨 UI/UX Design
- **Glass Morphism**: Modern design trend with backdrop filters and transparency effects
- **CSS Variables**: Maintainable styling system with consistent design tokens
- **Animation System**: Smooth entrance animations and hover effects
- **Loading States**: Clear feedback for asynchronous operations

### 🔒 Security Features
- **Input Validation**: Client and server-side validation for all user inputs
- **Content Filtering**: AI safety settings to prevent harmful or inappropriate responses
- **Environment Security**: Secure API key management through environment variables
- **CORS Configuration**: Proper cross-origin request handling

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm (Node Package Manager)
- Google Gemini API key

### 1. Clone the Repository
```bash
git clone https://github.com/ashesbloom/Ai-debt-management-.git
cd Ai-debt-management-
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=3000
```

**To get a Gemini API key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

### 4. Start the Application
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📖 Usage Guide

### Adding Debts
1. Navigate to the "Add a Debt" section
2. Fill in the debt details:
   - **Name**: Credit card, loan, etc.
   - **Current Balance**: Outstanding amount
   - **APR**: Annual Percentage Rate
   - **Minimum Payment**: Monthly minimum payment
3. Click "Add Debt" to save

### Chatting with the AI Coach
1. Add at least one debt to get personalized advice
2. Use the chat interface to ask questions like:
   - "What's the best strategy for my debts?"
   - "Should I use snowball or avalanche method?"
   - "What if I pay an extra Rs. 500 monthly?"
   - "How long will it take to pay off my debts?"

### Managing Your Debt Portfolio
- **View Debts**: All added debts are displayed with key information
- **Download Report**: Export your debt data as a CSV file
- **Clear All Debts**: Remove all debts with confirmation

## 🔌 API Documentation

### Debt Management Endpoints

#### GET `/api/debts`
Retrieve all current debts.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Credit Card",
    "balance": 5000,
    "apr": 18.5,
    "min_payment": 150
  }
]
```

#### POST `/api/debts`
Add a new debt.

**Request Body:**
```json
{
  "name": "Student Loan",
  "balance": 25000,
  "apr": 6.5,
  "min_payment": 300
}
```

#### DELETE `/api/debts`
Clear all debts.

#### GET `/api/debts/download`
Download debt report as CSV file.

### AI Coaching Endpoint

#### POST `/api/coach/chat`
Send a message to the AI coach.

**Request Body:**
```json
{
  "userMessage": "What's the best strategy for my debts?"
}
```

**Response:**
```json
{
  "aiResponse": "Based on your current debts, I recommend..."
}
```

## 🎯 Core Features Overview

### Debt Repayment Strategies
The AI coach explains and compares two proven methods:

**Snowball Method**: Pay minimum on all debts, then put extra money toward the smallest balance first. Provides psychological motivation through quick wins.

**Avalanche Method**: Pay minimum on all debts, then put extra money toward the highest interest rate first. Mathematically optimal for minimizing total interest paid.

### Smart AI Coaching
- Analyzes your specific debt situation
- Provides personalized recommendations
- Explains complex financial concepts in simple terms
- Encourages and motivates throughout your debt-free journey
- Considers extra payment scenarios and their impact

### Data Export
- Download your debt portfolio as CSV
- Track progress over time
- Share with financial advisors
- Backup your data


### Areas for Contribution
- **UI/UX Improvements**: Enhance the user interface and experience
- **AI Prompt Engineering**: Improve the AI coaching responses
- **Feature Additions**: Add new debt management features
- **Security Enhancements**: Strengthen security measures
- **Performance Optimizations**: Improve application performance
- **Documentation**: Enhance documentation and examples

### Code Style
- Use ES6+ features and modern JavaScript
- Follow consistent naming conventions
- Add comments for complex logic
- Ensure responsive design
- Test across different browsers

## 🙏 Acknowledgments

- **Google Gemini AI** for providing the intelligent coaching capabilities
- **Express.js** community for the robust web framework
- **Papa Parse** for CSV handling
- **Day.js** for date manipulation
- All contributors and users who help improve this project

## 📞 Support

If you encounter any issues or have questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs
4. Provide your environment details (Node.js version, OS, etc.)

---

**Start your journey to financial freedom today with AI-powered debt management! 🚀💪**
