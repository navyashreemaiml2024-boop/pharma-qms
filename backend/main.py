from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json

from database import SessionLocal, Complaint, Base, engine
from ai_workflow import run_complaint_workflow


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="PharmaQMS AI Complaint API",
    description="AI Complaint Management System for Pharmaceutical Quality Management",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pharma-qms-web.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE SESSION
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# REQUEST MODEL
# =========================================================

class ComplaintRequest(BaseModel):
    complaintSource: str = ""
    customerName: str = ""
    email: str = ""

    productType: str = "FDF"
    productName: str = ""
    strength: str = ""
    batchNumber: str = ""

    manufacturingDate: str = ""
    expiryDate: str = ""

    quantityAffected: str = ""

    complaintType: str = ""
    complaintDate: str = ""

    description: str = ""

    severity: str = "Medium"
    priority: str = "Medium"


# =========================================================
# AI ANALYSIS
# =========================================================

def analyze_complaint(complaint: ComplaintRequest):

    text = complaint.description.lower()

    category = complaint.complaintType or "Product Quality"

    severity = complaint.severity

    risk_level = "MEDIUM"
    risk_score = 45

    action = (
        "Review the complaint and perform an "
        "initial quality assessment."
    )

    # -----------------------------------------------------
    # CRITICAL
    # -----------------------------------------------------

    if (
        "death" in text
        or "fatal" in text
        or "hospital" in text
        or "serious injury" in text
    ):
        category = "Patient Safety"
        severity = "Critical"
        risk_level = "CRITICAL"
        risk_score = 95

        action = (
            "Immediately escalate to Quality Assurance "
            "and Pharmacovigilance teams."
        )

    # -----------------------------------------------------
    # HIGH
    # -----------------------------------------------------

    elif (
        "contamination" in text
        or "wrong medicine" in text
        or "incorrect dosage" in text
        or "leakage" in text
        or "broken" in text
        or "cracks" in text
    ):
        category = "Product Quality"
        severity = "High"
        risk_level = "HIGH"
        risk_score = 82

        action = (
            "Initiate batch investigation and review "
            "manufacturing and packaging records."
        )

    # -----------------------------------------------------
    # MEDIUM
    # -----------------------------------------------------

    elif (
        "damaged" in text
        or "discoloration" in text
        or "label" in text
        or "missing tablet" in text
        or "packaging" in text
    ):
        category = "Packaging / Appearance"
        severity = "Medium"
        risk_level = "MEDIUM"
        risk_score = 60

        action = (
            "Review packaging controls, batch records "
            "and affected product samples."
        )

    # -----------------------------------------------------
    # LOW
    # -----------------------------------------------------

    elif (
        "minor" in text
        or "appearance" in text
        or "information" in text
    ):
        category = "General Quality"
        severity = "Low"
        risk_level = "LOW"
        risk_score = 25

        action = (
            "Record the complaint and monitor for "
            "recurring trends."
        )

    # -----------------------------------------------------
    # RESPECT MANUAL SEVERITY
    # -----------------------------------------------------

    if complaint.severity == "Critical":
        severity = "Critical"
        risk_level = "CRITICAL"
        risk_score = max(risk_score, 95)

    elif complaint.severity == "High":
        severity = "High"
        risk_level = "HIGH"
        risk_score = max(risk_score, 82)

    # -----------------------------------------------------
    # COMPLETENESS
    # -----------------------------------------------------

    complete = (
        bool(complaint.customerName)
        and bool(complaint.productName)
        and bool(complaint.batchNumber)
        and bool(complaint.description)
    )

    # -----------------------------------------------------
    # RESULT
    # -----------------------------------------------------

    result = {
        "completeness": (
            "Complete"
            if complete
            else "Needs Review"
        ),

        "duplicate": "No likely duplicate found",

        "category": category,

        "severity": severity,

        "riskScore": risk_score,

        "riskLevel": risk_level,

        "action": action,

        "rootCause": (
            "Possible manufacturing or process-related issue. "
            "Batch records and manufacturing controls should "
            "be reviewed."
        ),

        "capa": {
            "corrective": (
                "Investigate the affected batch, review "
                "manufacturing records and evaluate "
                "retained samples."
            ),

            "preventive": (
                "Strengthen process monitoring, trend similar "
                "complaints and review preventive controls."
            ),
        },

        "summary": (
            f"AI assessment identified a "
            f"{risk_level.lower()} risk complaint related to "
            f"{category.lower()} involving "
            f"{complaint.productName or 'the pharmaceutical product'}."
        ),
    }

    return result


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "message": "PharmaQMS AI Complaint API is running",
        "status": "online",
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "PharmaQMS Backend",
        "database": "SQLite",
    }


# =========================================================
# ANALYZE COMPLAINT
# =========================================================

@app.post("/analyze")
def analyze(
    complaint: ComplaintRequest
):

    result = analyze_complaint(complaint)

    return {
        "success": True,
        "analysis": result,
    }


# =========================================================
# SAVE COMPLAINT
# =========================================================

@app.post("/complaints")
def save_complaint(
    complaint: ComplaintRequest,
    db: Session = Depends(get_db)
):

    analysis = analyze_complaint(complaint)

    new_complaint = Complaint(

        complaintSource=complaint.complaintSource,
        customerName=complaint.customerName,
        email=complaint.email,

        productType=complaint.productType,
        productName=complaint.productName,
        strength=complaint.strength,
        batchNumber=complaint.batchNumber,

        manufacturingDate=complaint.manufacturingDate,
        expiryDate=complaint.expiryDate,

        quantityAffected=complaint.quantityAffected,

        complaintType=complaint.complaintType,
        complaintDate=complaint.complaintDate,

        description=complaint.description,

        severity=analysis["severity"],
        priority=complaint.priority,

        aiAnalysis=json.dumps(analysis),
    )

    db.add(new_complaint)

    db.commit()

    db.refresh(new_complaint)

    return {
        "success": True,
        "message": "Complaint saved successfully",
        "complaintId": new_complaint.id,
        "analysis": analysis,
    }


# =========================================================
# GET COMPLAINT HISTORY
# =========================================================

@app.get("/complaints")
def get_complaints(
    db: Session = Depends(get_db)
):

    complaints = (
        db.query(Complaint)
        .order_by(Complaint.id.desc())
        .all()
    )

    result = []

    for complaint in complaints:

        analysis = None

        if complaint.aiAnalysis:

            try:
                analysis = json.loads(
                    complaint.aiAnalysis
                )

            except Exception:
                analysis = None

        result.append({

            "id": complaint.id,

            "complaintSource": complaint.complaintSource,

            "customerName": complaint.customerName,

            "email": complaint.email,

            "productType": complaint.productType,

            "productName": complaint.productName,

            "strength": complaint.strength,

            "batchNumber": complaint.batchNumber,

            "manufacturingDate": complaint.manufacturingDate,

            "expiryDate": complaint.expiryDate,

            "quantityAffected": complaint.quantityAffected,

            "complaintType": complaint.complaintType,

            "complaintDate": complaint.complaintDate,

            "description": complaint.description,

            "severity": complaint.severity,

            "priority": complaint.priority,

            "aiAnalysis": analysis,

        })

    return {
        "success": True,
        "count": len(result),
        "complaints": result,
    }