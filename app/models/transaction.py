from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional

@dataclass
class Transaction:
    date: datetime
    description: str
    debit_amount: Optional[Decimal]
    credit_amount: Optional[Decimal]
    
    @property
    def amount(self) -> Decimal:
        """Returns the transaction amount, positive for credits and negative for debits"""
        if self.credit_amount:
            return self.credit_amount
        return -self.debit_amount if self.debit_amount else Decimal('0') 