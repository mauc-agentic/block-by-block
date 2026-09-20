# models.py
# Entity model (UC-001..011): USER, CAUSE, DONATION, VERIFICATION

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Numeric, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.session import Base

class CauseStatus(str, enum.Enum):
    """Estados de una causa (UC-004, UC-005, UC-006)."""
    Pending = "Pending"
    Verified = "Verified"
    Rejected = "Rejected"
    Completed = "Completed"

class User(Base):
    """UC-001: Cuenta de usuario (donante o receptor)."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    wallet_address = Column(String(42), unique=True, nullable=True, index=True)
    user_type = Column(String(20), nullable=False)  # "donor" o "recipient"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relaciones
    causes = relationship("Cause", back_populates="recipient")
    donations = relationship("Donation", back_populates="donor")
    
    def __repr__(self):
        return f"<User {self.username} ({self.user_type})>"

class Cause(Base):
    """UC-004: Causa publicada por un receptor."""
    __tablename__ = "causes"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    onchain_cause_id = Column(Integer, unique=True, nullable=True, index=True)  # Sincronización con contrato
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    image_hash = Column(String(100), nullable=True)  # IPFS hash
    target_amount = Column(Numeric(18, 6), nullable=False)  # USDT con 6 decimales
    status = Column(String(20), default=CauseStatus.Pending.value, nullable=False, index=True)
    verification_hash = Column(String(100), nullable=True)  # IPFS hash del análisis IA
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relaciones
    recipient = relationship("User", back_populates="causes")
    donations = relationship("Donation", back_populates="cause")
    verification = relationship("Verification", back_populates="cause", uselist=False)
    
    def __repr__(self):
        return f"<Cause {self.id} {self.title} ({self.status})>"

class Donation(Base):
    """UC-009: Donación registrada en el contrato."""
    __tablename__ = "donations"
    
    id = Column(Integer, primary_key=True, index=True)
    cause_id = Column(Integer, ForeignKey("causes.id"), nullable=False, index=True)
    donor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Numeric(18, 6), nullable=False)  # USDT con 6 decimales
    tx_hash = Column(String(66), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relaciones
    cause = relationship("Cause", back_populates="donations")
    donor = relationship("User", back_populates="donations")
    
    def __repr__(self):
        return f"<Donation {self.id} cause={self.cause_id} amount={self.amount}>"

class Verification(Base):
    """UC-006: Resultado de verificación del agente."""
    __tablename__ = "verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    cause_id = Column(Integer, ForeignKey("causes.id"), nullable=False, unique=True, index=True)
    verified = Column(Boolean, nullable=False)
    confidence = Column(Numeric(3, 2), nullable=False)  # 0.0 a 1.0
    reason = Column(String(500), nullable=False)
    tx_hash = Column(String(66), unique=True, nullable=True, index=True)  # Hash de verifyCause en HSK
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relaciones
    cause = relationship("Cause", back_populates="verification")
    
    def __repr__(self):
        return f"<Verification cause={self.cause_id} verified={self.verified} confidence={self.confidence}>"
