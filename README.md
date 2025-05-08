# Financial Planning App

A modern web application for tracking personal finances, analyzing spending patterns, and monitoring net worth.

## Features

- Import transaction data from CSV files (credit cards and bank accounts)
- Categorize and analyze spending patterns
- Track monthly income and expenses
- Monitor net worth over time
- Interactive visualizations and reports

## Tech Stack

- Backend: Python with FastAPI
- Frontend: React with TypeScript
- Database: SQLite (for simplicity, can be upgraded to PostgreSQL)
- Data Processing: Pandas
- Visualization: Chart.js

## Setup Instructions

### Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the backend server:
```bash
uvicorn app.main:app --reload
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

## Project Structure

```
financialPlanning/
├── app/                    # Backend application
│   ├── main.py            # FastAPI application entry point
│   ├── models/            # Database models
│   ├── schemas/           # Pydantic schemas
│   └── services/          # Business logic
├── frontend/              # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── requirements.txt       # Python dependencies
└── README.md
``` 