from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from typing import List
import json
from datetime import datetime
import os

app = FastAPI(title="Financial Planning API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/upload-transactions")
async def upload_transactions(file: UploadFile = File(...)):
    """
    Upload and process a CSV file containing transaction data
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        # Read the CSV file
        df = pd.read_csv(file.file)
        
        # Basic validation
        required_columns = ['date', 'amount', 'description']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400,
                detail=f"CSV must contain these columns: {', '.join(required_columns)}"
            )
        
        # Process the data
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.strftime('%Y-%m')
        
        # Calculate monthly statistics
        monthly_stats = df.groupby('month').agg({
            'amount': ['sum', 'count']
        }).reset_index()
        
        monthly_stats.columns = ['month', 'total_amount', 'transaction_count']
        
        # Save processed data
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        processed_file = f"{UPLOAD_DIR}/processed_{timestamp}.csv"
        df.to_csv(processed_file, index=False)
        
        return {
            "message": "File processed successfully",
            "monthly_stats": monthly_stats.to_dict(orient='records')
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"} 