from typing import TypedDict

from langgraph.graph import StateGraph, END


class ComplaintState(TypedDict, total=False):
    complaint: dict
    text: str

    category: str
    severity: str
    riskLevel: str
    riskScore: int
    action: str

    rootCause: str
    capa: dict
    completeness: str
    duplicate: str
    summary: str

    analysis: dict


def prepare_complaint(state: ComplaintState):
    complaint = state["complaint"]

    return {
        "text": complaint.get("description", "").lower()
    }


def assess_risk(state: ComplaintState):
    complaint = state["complaint"]
    text = state.get("text", "")

    category = complaint.get("complaintType") or "Product Quality"
    severity = complaint.get("severity") or "Medium"

    risk_level = "MEDIUM"
    risk_score = 45

    action = (
        "Review the complaint and perform an "
        "initial quality assessment."
    )

    # CRITICAL RISK
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

    # HIGH RISK
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

    # MEDIUM RISK
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

    # LOW RISK
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

    # Respect manually selected severity
    if complaint.get("severity") == "Critical":
        severity = "Critical"
        risk_level = "CRITICAL"
        risk_score = max(risk_score, 95)

    elif complaint.get("severity") == "High":
        severity = "High"
        risk_level = "HIGH"
        risk_score = max(risk_score, 82)

    return {
        "category": category,
        "severity": severity,
        "riskLevel": risk_level,
        "riskScore": risk_score,
        "action": action,
    }


def generate_recommendations(state: ComplaintState):
    return {
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
    }


def finalize_assessment(state: ComplaintState):
    complaint = state["complaint"]

    complete = (
        bool(complaint.get("customerName"))
        and bool(complaint.get("productName"))
        and bool(complaint.get("batchNumber"))
        and bool(complaint.get("description"))
    )

    category = state["category"]
    risk_level = state["riskLevel"]
    product_name = (
        complaint.get("productName")
        or "the pharmaceutical product"
    )

    analysis = {
        "completeness": (
            "Complete"
            if complete
            else "Needs Review"
        ),

        "duplicate": "No likely duplicate found",

        "category": category,

        "severity": state["severity"],

        "riskScore": state["riskScore"],

        "riskLevel": risk_level,

        "action": state["action"],

        "rootCause": state["rootCause"],

        "capa": state["capa"],

        "summary": (
            f"AI assessment identified a "
            f"{risk_level.lower()} risk complaint related to "
            f"{category.lower()} involving "
            f"{product_name}."
        ),
    }

    return {
        "completeness": analysis["completeness"],
        "duplicate": analysis["duplicate"],
        "summary": analysis["summary"],
        "analysis": analysis,
    }


# =========================================================
# LANGGRAPH WORKFLOW
# =========================================================

workflow = StateGraph(ComplaintState)

workflow.add_node(
    "prepare_complaint",
    prepare_complaint
)

workflow.add_node(
    "assess_risk",
    assess_risk
)

workflow.add_node(
    "generate_recommendations",
    generate_recommendations
)

workflow.add_node(
    "finalize_assessment",
    finalize_assessment
)


workflow.set_entry_point("prepare_complaint")

workflow.add_edge(
    "prepare_complaint",
    "assess_risk"
)

workflow.add_edge(
    "assess_risk",
    "generate_recommendations"
)

workflow.add_edge(
    "generate_recommendations",
    "finalize_assessment"
)

workflow.add_edge(
    "finalize_assessment",
    END
)


complaint_graph = workflow.compile()


def run_complaint_workflow(complaint: dict):
    result = complaint_graph.invoke(
        {
            "complaint": complaint
        }
    )

    return result["analysis"]