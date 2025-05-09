import os
import logging
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse

from app.services.transaction_service import TransactionService
from app.models.transaction import Transaction

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Store uploaded files information
UPLOAD_DIR = Path("app/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/transactions/upload")
async def upload_transactions(
    files: List[UploadFile] = File(...),
    year: Optional[str] = Query(None, description="Filter by year (YYYY)"),
    month: Optional[str] = Query(None, description="Filter by month (MM)")
):
    """
    Upload multiple CIBC transaction files and get spending analysis.
    Optionally filter by year and month.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    logger.info(f"Received {len(files)} files for upload")
    all_transactions = []
    saved_files = []

    try:
        for file in files:
            logger.info(f"Processing file: {file.filename}")
            if not file.filename.endswith('.csv'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} must be a CSV")

            # Create a unique filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = f"{timestamp}_{file.filename}"
            file_path = UPLOAD_DIR / safe_filename

            # Save the file
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            saved_files.append(str(file_path))
            logger.info(f"Saved file to: {file_path}")

            try:
                # Read transactions
                transactions = TransactionService.read_cibc_transactions(file_path)
                logger.info(f"Read {len(transactions)} transactions from {file.filename}")
                all_transactions.extend(transactions)
            except Exception as e:
                logger.error(f"Error reading transactions from {file.filename}: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Error reading file {file.filename}: {str(e)}")

        # Get analysis for combined transactions
        try:
            analysis = TransactionService.get_spending_summary(all_transactions, year, month)
            logger.info("Analysis completed successfully")
            
            # Add file information to response
            analysis['uploaded_files'] = saved_files
            
            return analysis
        except Exception as e:
            logger.error(f"Error analyzing transactions: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error analyzing transactions: {str(e)}")

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during upload: {str(e)}")
        # Clean up saved files in case of error
        for file_path in saved_files:
            try:
                os.remove(file_path)
                logger.info(f"Cleaned up file: {file_path}")
            except Exception as cleanup_error:
                logger.error(f"Error cleaning up file {file_path}: {str(cleanup_error)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/files")
async def list_uploaded_files():
    """List all previously uploaded transaction files"""
    try:
        files = []
        for file_path in UPLOAD_DIR.glob("*.csv"):
            files.append({
                "filename": file_path.name,
                "path": str(file_path),
                "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            })
        return {"files": sorted(files, key=lambda x: x["uploaded_at"], reverse=True)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transactions/analyze")
async def analyze_files(
    file_paths: List[str],
    year: Optional[str] = Query(None, description="Filter by year (YYYY)"),
    month: Optional[str] = Query(None, description="Filter by month (MM)")
):
    """Analyze specific uploaded files"""
    logger.info(f"Analyzing {len(file_paths)} files")
    try:
        all_transactions = []
        for file_path in file_paths:
            path = Path(file_path)
            if not path.is_file():
                logger.error(f"File not found: {file_path}")
                raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
            try:
                transactions = TransactionService.read_cibc_transactions(path)
                logger.info(f"Read {len(transactions)} transactions from {path}")
                all_transactions.extend(transactions)
            except Exception as e:
                logger.error(f"Error reading transactions from {path}: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Error reading file {path}: {str(e)}")

        analysis = TransactionService.get_spending_summary(all_transactions, year, month)
        analysis['analyzed_files'] = file_paths
        logger.info("Analysis completed successfully")
        return analysis

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/transactions/files/{filename}")
async def delete_file(filename: str):
    """Delete a specific uploaded file"""
    try:
        file_path = UPLOAD_DIR / filename
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        os.remove(file_path)
        return {"message": f"File {filename} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 