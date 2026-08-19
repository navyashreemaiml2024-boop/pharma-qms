import os
import json
from typing import TypedDict

from groq import Groq
from langgraph.graph import StateGraph, END


# =========================================================
# LANGGRAPH STATE
# =========================================================

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


# =========================================================
# GROQ CLIENT
# =========================================================

def get_groq_client():

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY environment variable is not configured."
        )

    return Groq(api_key=api_key)


# =========================================================
# NODE 1 — PREPARE COMPLAINT
# =========================================================

def prepare_complaint(state: ComplaintState):

    complaint = state["complaint"]

    return {
        "text": complaint.get(
            "description",
            ""
        ).strip()
    }


# =========================================================
# NODE 2 — GROQ LLM ANALYSIS
# =========================================================

def assess_risk(state: ComplaintState):

    complaint = state["complaint"]
    text = state.get("text", "")

    client = get_groq_client()

    product_name = complaint.get(
        "productName",
        "Unknown product"
    )

    complaint_type = complaint.get(
        "complaintType",
        "Product Quality"
    )

    manual_severity = complaint.get(
        "severity",
        "Medium"
    )

    prompt = f"""
Analyze the following pharmaceutical product complaint.

Product:
{product_name}

Complaint Type:
{complaint_type}

User Selected Severity:
{manual_severity}

Complaint Description:
{text}

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{{
  "category": "string",
  "severity": "Low | Medium | High | Critical",
  "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "riskScore": 0,
  "action": "string",
  "rootCause": "string",
  "capa": {{
    "corrective": "string",
    "preventive": "string"
  }},
  "summary": "string"
}}

Rules:

1. Assess the complaint based on the information provided.
2. riskScore must be an integer from 0 to 100.
3. riskLevel must match the riskScore and severity.
4. If the user selected Critical severity, do not downgrade it.
5. If the user selected High severity, do not downgrade it.
6. Provide a practical pharmaceutical quality action.
7. Provide a possible root cause, clearly treating it as a possibility.
8. Provide corrective and preventive CAPA recommendations.
9. Do not invent patient information or test results.
10. Do not include markdown.
11. Return JSON only.
"""

    response = client.chat.completions.create(
    model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a pharmaceutical quality complaint "
                    "assessment assistant. Provide structured, "
                    "careful and evidence-based complaint analysis."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.2,
        max_completion_tokens=1000,
    )

    content = response.choices[0].message.content.strip()

    # Remove accidental markdown JSON fences
    if content.startswith("```json"):
        content = content[7:]

    if content.startswith("```"):
        content = content[3:]

    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    try:
        result = json.loads(content)

    except json.JSONDecodeError as exc:

        raise RuntimeError(
            "Groq returned invalid JSON. "
            f"Raw response: {content}"
        ) from exc

    return {
        "category": result.get(
            "category",
            "Product Quality"
        ),

        "severity": result.get(
            "severity",
            manual_severity
        ),

        "riskLevel": result.get(
            "riskLevel",
            "MEDIUM"
        ),

        "riskScore": int(
            result.get(
                "riskScore",
                50
            )
        ),

        "action": result.get(
            "action",
            "Perform an initial quality assessment."
        ),

        "rootCause": result.get(
            "rootCause",
            "Root cause requires further investigation."
        ),

        "capa": result.get(
            "capa",
            {
                "corrective": (
                    "Investigate the affected batch "
                    "and review relevant records."
                ),
                "preventive": (
                    "Review preventive controls and "
                    "monitor similar complaints."
                ),
            }
        ),
    }


# =========================================================
# NODE 3 — FINALIZE ASSESSMENT
# =========================================================

def finalize_assessment(state: ComplaintState):

    complaint = state["complaint"]

    complete = (
        bool(complaint.get("customerName"))
        and bool(complaint.get("productName"))
        and bool(complaint.get("batchNumber"))
        and bool(complaint.get("description"))
    )

    product_name = (
        complaint.get("productName")
        or "the pharmaceutical product"
    )

    category = state.get(
        "category",
        "Product Quality"
    )

    severity = state.get(
        "severity",
        "Medium"
    )

    risk_level = state.get(
        "riskLevel",
        "MEDIUM"
    )

    risk_score = state.get(
        "riskScore",
        50
    )

    action = state.get(
        "action",
        "Perform an initial quality assessment."
    )

    root_cause = state.get(
        "rootCause",
        "Root cause requires further investigation."
    )

    capa = state.get(
        "capa",
        {}
    )

    summary = (
        f"AI assessment identified a "
        f"{risk_level.lower()} risk complaint related to "
        f"{category.lower()} involving "
        f"{product_name}."
    )

    analysis = {

        "completeness": (
            "Complete"
            if complete
            else "Needs Review"
        ),

        "duplicate": (
            "No duplicate check performed"
        ),

        "category": category,

        "severity": severity,

        "riskScore": risk_score,

        "riskLevel": risk_level,

        "action": action,

        "rootCause": root_cause,

        "capa": capa,

        "summary": summary,
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
    "finalize_assessment",
    finalize_assessment
)


workflow.set_entry_point(
    "prepare_complaint"
)


workflow.add_edge(
    "prepare_complaint",
    "assess_risk"
)

workflow.add_edge(
    "assess_risk",
    "finalize_assessment"
)

workflow.add_edge(
    "finalize_assessment",
    END
)


# Compile LangGraph
complaint_graph = workflow.compile()


# =========================================================
# WORKFLOW EXECUTION
# =========================================================

def run_complaint_workflow(
    complaint: dict
):

    result = complaint_graph.invoke(
        {
            "complaint": complaint
        }
    )

    return result["analysis"]
