import os
from decimal import Decimal
from pathlib import Path

import pytest

from app.models.transaction import Transaction
from app.services.transaction_service import TransactionService

def test_read_cibc_transactions():
    # Get the path to the test data file
    file_path = Path('app/data/cibcTransactions')
    
    # Read transactions
    transactions = TransactionService.read_cibc_transactions(file_path)
    
    # Verify we got transactions
    assert len(transactions) > 0
    
    # Verify the first transaction
    first_transaction = transactions[0]
    assert isinstance(first_transaction, Transaction)
    assert first_transaction.description == "Branch Transaction SERVICE CHARGE DISCOUNT"
    assert first_transaction.credit_amount == Decimal('29.95')
    assert first_transaction.debit_amount is None

def test_transaction_calculations():
    # Create some test transactions
    transactions = [
        Transaction(
            date="2024-01-01",
            description="Credit Test",
            debit_amount=None,
            credit_amount=Decimal('100.00')
        ),
        Transaction(
            date="2024-01-02",
            description="Debit Test",
            debit_amount=Decimal('50.00'),
            credit_amount=None
        )
    ]
    
    # Test balance calculation
    balance = TransactionService.get_balance(transactions)
    assert balance == Decimal('50.00')
    
    # Test credit total
    total_credits = TransactionService.get_total_credits(transactions)
    assert total_credits == Decimal('100.00')
    
    # Test debit total
    total_debits = TransactionService.get_total_debits(transactions)
    assert total_debits == Decimal('50.00') 