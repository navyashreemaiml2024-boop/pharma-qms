from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = "sqlite:///./pharmaqms.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)

    complaintSource = Column(String)
    customerName = Column(String)
    email = Column(String)

    productType = Column(String)
    productName = Column(String)
    strength = Column(String)
    batchNumber = Column(String)

    manufacturingDate = Column(String)
    expiryDate = Column(String)

    quantityAffected = Column(String)

    complaintType = Column(String)
    complaintDate = Column(String)

    description = Column(Text)

    severity = Column(String)
    priority = Column(String)

    aiAnalysis = Column(Text)


Base.metadata.create_all(bind=engine)