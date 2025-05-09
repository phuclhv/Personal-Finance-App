import csv
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import List, Dict, Tuple, Optional

from app.models.transaction import Transaction

class TransactionService:
    # Investment-related keywords to exclude from regular income/expense calculations
    INVESTMENT_KEYWORDS = [
        'WEALTHSIMPLE',
        'QUESTRADE',
        'INVESTMENT',
        'EDWARD JONES',
        'TFE / EFT QUESTRADE',
        'SHAREOWNER',
    ]

    # Category keywords for better expense tracking
    CATEGORY_KEYWORDS = {
        'Groceries': [
            'SUPERMARKET', 'T&T', 'LUCKY', 'MARKET', 'COSTCO', 
            'WALMART', 'HEN LONG', 'PRODUCE', 'FOOD', 'GROCERY'
        ],
        'Dining': [
            'RESTAURANT', 'CAFE', 'PHO', 'DINING', 'UBER*EATS', 
            'UBER * EATS', 'SUSHI', 'BAR', 'PUB', 'THAI',
            'BUBBLE', 'TEA', 'YIFANG', 'BANH', 'MILK & SUGAR',
            'DUFFIN', 'DONUT', 'CARL\'S JR'
        ],
        'Transportation': [
            'UBER', 'COMPASS', 'TRANSIT', 'PARKING', 'ICBC',
            'ATM WITHDRAWAL', 'GAS', 'SHELL', 'CANADIAN TIRE'
        ],
        'Shopping': [
            'WALMART', 'COSTCO', 'RETAIL', 'AMZN', 'AMAZON',
            'ALIEXPRESS', 'SPORT CHEK', 'STORE', 'PURCHASE'
        ],
        'Bills & Utilities': [
            'BILL', 'SERVICE CHARGE', 'ROGERS', 'INSURANCE',
            'MASTERCARD', 'NETWORK FEE', 'PHONE', 'INTERNET',
            'UTILITIES', 'HYDRO', 'CARD PRODUCTS'
        ],
        'Entertainment': [
            'MOVIE', 'CINEMA', 'THEATRE', 'GAME', 'SPORT',
            'BADMINTON', 'ENTERTAINMENT', 'ART', 'GALLERY'
        ],
        'Healthcare': [
            'MEDICAL', 'DENTAL', 'PHARMACY', 'HEALTH', 'CLINIC',
            'PHARMASAVE', 'DRUG', 'ASSURE HEALTH'
        ],
        'Education': [
            'TUITION', 'SCHOOL', 'COLLEGE', 'UNIVERSITY', 'BCIT',
            'COURSE', 'EXAM', 'IELTS'
        ],
        'Investments': INVESTMENT_KEYWORDS,
        'Income': [
            'DEPOSIT', 'PAYROLL', 'REFUND', 'CANADA LIFE',
            'AMAZON DEVELOPMENT', 'FULFILLMENT', 'TAX REFUND',
            'CREDIT MEMO', 'AE/EI'
        ],
        'Transfers': ['E-TRANSFER', 'TRANSFER', 'IBB'],
    }

    @staticmethod
    def is_investment_transaction(description: str) -> bool:
        """Check if a transaction is investment-related"""
        upper_desc = description.upper()
        return any(keyword.upper() in upper_desc for keyword in TransactionService.INVESTMENT_KEYWORDS)

    @staticmethod
    def read_cibc_transactions(file_path: str | Path) -> List[Transaction]:
        """
        Reads a CIBC transaction CSV file and returns a list of Transaction objects.
        
        The file format is expected to be:
        Date,Description,Debit,Credit
        """
        transactions = []
        
        with open(file_path, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                # Parse date
                date = datetime.strptime(row[0], '%Y-%m-%d')
                
                # Get description
                description = row[1]
                
                # Parse amounts, handling empty strings
                debit_str = row[2].strip()
                credit_str = row[3].strip()
                
                debit_amount = Decimal(debit_str) if debit_str else None
                credit_amount = Decimal(credit_str) if credit_str else None
                
                transaction = Transaction(
                    date=date,
                    description=description,
                    debit_amount=debit_amount,
                    credit_amount=credit_amount
                )
                transactions.append(transaction)
                
        return transactions

    @staticmethod
    def filter_transactions_by_date(
        transactions: List[Transaction],
        year: Optional[str] = None,
        month: Optional[str] = None
    ) -> List[Transaction]:
        """Filter transactions by year and optionally month"""
        if not year:
            return transactions

        filtered = [t for t in transactions if t.date.strftime('%Y') == year]
        if month:
            filtered = [t for t in filtered if t.date.strftime('%m') == month]
        
        return filtered

    @staticmethod
    def get_balance(
        transactions: List[Transaction],
        year: Optional[str] = None,
        month: Optional[str] = None,
        exclude_investments: bool = True
    ) -> Decimal:
        """Calculate the balance for the specified period"""
        filtered = TransactionService.filter_transactions_by_date(transactions, year, month)
        if exclude_investments:
            filtered = [t for t in filtered if not TransactionService.is_investment_transaction(t.description)]
        return sum((t.amount for t in filtered), Decimal('0'))

    @staticmethod
    def get_total_credits(
        transactions: List[Transaction],
        year: Optional[str] = None,
        month: Optional[str] = None,
        exclude_investments: bool = True
    ) -> Decimal:
        """Calculate total credits (income) for the specified period"""
        filtered = TransactionService.filter_transactions_by_date(transactions, year, month)
        if exclude_investments:
            filtered = [t for t in filtered if not TransactionService.is_investment_transaction(t.description)]
        return sum((t.credit_amount for t in filtered if t.credit_amount), Decimal('0'))

    @staticmethod
    def get_total_debits(
        transactions: List[Transaction],
        year: Optional[str] = None,
        month: Optional[str] = None,
        exclude_investments: bool = True
    ) -> Decimal:
        """Calculate total debits (expenses) for the specified period"""
        filtered = TransactionService.filter_transactions_by_date(transactions, year, month)
        if exclude_investments:
            filtered = [t for t in filtered if not TransactionService.is_investment_transaction(t.description)]
        return sum((t.debit_amount for t in filtered if t.debit_amount), Decimal('0'))

    @staticmethod
    def analyze_monthly_spending(
        transactions: List[Transaction], 
        year: Optional[str] = None,
        exclude_investments: bool = True
    ) -> Dict[str, Dict[str, Decimal]]:
        """
        Analyze spending patterns by month for a specific year.
        Returns a dictionary with monthly totals for credits and debits.
        """
        filtered = TransactionService.filter_transactions_by_date(transactions, year)
        if exclude_investments:
            filtered = [t for t in filtered if not TransactionService.is_investment_transaction(t.description)]
            
        monthly_totals = defaultdict(lambda: {'credits': Decimal('0'), 'debits': Decimal('0')})
        
        for transaction in filtered:
            month_key = transaction.date.strftime('%Y-%m')
            if transaction.credit_amount:
                monthly_totals[month_key]['credits'] += transaction.credit_amount
            if transaction.debit_amount:
                monthly_totals[month_key]['debits'] += transaction.debit_amount
        
        return dict(monthly_totals)

    @staticmethod
    def analyze_spending_categories(
        transactions: List[Transaction],
        year: Optional[str] = None,
        month: Optional[str] = None,
        exclude_investments: bool = True
    ) -> Dict[str, Decimal]:
        """
        Analyze spending by basic categories for the specified period.
        Returns a dictionary of category totals.
        """
        filtered = TransactionService.filter_transactions_by_date(transactions, year, month)
        categories = defaultdict(Decimal)
        
        # Get category keywords, optionally excluding investments
        category_keywords = TransactionService.CATEGORY_KEYWORDS.copy()
        if exclude_investments:
            category_keywords.pop('Investments', None)
        
        for transaction in filtered:
            categorized = False
            # For expenses, use debit amount; for income, use credit amount
            amount = transaction.debit_amount if transaction.debit_amount else (transaction.credit_amount if transaction.credit_amount else Decimal('0'))
            
            # Skip zero amount transactions
            if amount == 0:
                continue
                
            for category, keywords in category_keywords.items():
                if any(keyword.upper() in transaction.description.upper() for keyword in keywords):
                    categories[category] += amount
                    categorized = True
                    break
            
            if not categorized and not (exclude_investments and TransactionService.is_investment_transaction(transaction.description)):
                categories['Other'] += amount
        
        return dict(categories)

    @staticmethod
    def get_spending_summary(
        transactions: List[Transaction],
        year: Optional[str] = None,
        month: Optional[str] = None,
        exclude_investments: bool = True
    ) -> Dict:
        """
        Get a comprehensive spending summary for the specified period including:
        - Total balance
        - Monthly patterns
        - Category breakdown
        - Income vs Expenses
        """
        # Calculate monthly patterns for all transactions
        monthly_patterns = TransactionService.analyze_monthly_spending(transactions, exclude_investments=exclude_investments)
        
        # Filter transactions for the specific period
        filtered_transactions = TransactionService.filter_transactions_by_date(transactions, year, month)
        
        # Calculate totals and category breakdown for the filtered period
        return {
            'total_balance': float(TransactionService.get_balance(filtered_transactions, exclude_investments=exclude_investments)),
            'total_income': float(TransactionService.get_total_credits(filtered_transactions, exclude_investments=exclude_investments)),
            'total_expenses': float(TransactionService.get_total_debits(filtered_transactions, exclude_investments=exclude_investments)),
            'monthly_patterns': {k: {sk: float(sv) for sk, sv in v.items()} 
                               for k, v in monthly_patterns.items()},
            'category_breakdown': {k: float(v) 
                                 for k, v in TransactionService.analyze_spending_categories(filtered_transactions, exclude_investments=exclude_investments).items()},
            'all_transactions': [
                {
                    'date': t.date.strftime('%Y-%m-%d'),
                    'description': t.description,
                    'debit_amount': float(t.debit_amount) if t.debit_amount else None,
                    'credit_amount': float(t.credit_amount) if t.credit_amount else None,
                }
                for t in transactions
            ]
        } 