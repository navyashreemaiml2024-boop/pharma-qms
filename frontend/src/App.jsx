import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setComplaint } from "./store/complaintSlice";
import "./App.css";

const API = "http://127.0.0.1:8000";

const emptyForm = {
  complaintSource: "",
  customerName: "",
  email: "",
  productType: "FDF",
  productName: "",
  strength: "",
  batchNumber: "",
  manufacturingDate: "",
  expiryDate: "",
  quantityAffected: "",
  complaintType: "",
  complaintDate: "",
  description: "",
  severity: "Medium",
  priority: "Medium",
};

function App() {
  const dispatch = useDispatch();

  const complaint = useSelector(
    (state) => state.complaint?.complaint
  );

  const [page, setPage] = useState("dashboard");
  const [form, setForm] = useState(emptyForm);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  /* =========================
     LOAD COMPLAINT HISTORY
  ========================= */

  const loadComplaints = async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(`${API}/complaints`);

      if (!response.ok) {
        throw new Error("Failed to load complaints");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setComplaints(data);
      } else {
        setComplaints(data.complaints || []);
      }
    } catch (error) {
      console.error(error);
      setHistoryError(
        "Unable to load complaint history. Please check that the backend is running."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  /* =========================
     LOAD HISTORY WHEN PAGE OPENS
  ========================= */

  useEffect(() => {
    if (page === "history") {
      loadComplaints();
    }
  }, [page]);

  /* =========================
     AI ANALYSIS
  ========================= */

  const analyzeComplaint = async () => {
    if (!form.description.trim()) {
      alert("Please enter a complaint description.");
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Backend analysis failed");
      }

      const data = await response.json();

      const result = data.analysis;

      setAnalysis(result);

      dispatch(
        setComplaint({
          ...form,
          severity: result.severity,
          aiAnalysis: result,
        })
      );
    } catch (error) {
      console.error(error);

      alert(
        "Cannot connect to the FastAPI backend.\n\n" +
          "Please make sure the backend is running."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  /* =========================
     SAVE COMPLAINT
  ========================= */

  const saveComplaint = async () => {
    if (
      !form.customerName ||
      !form.productName ||
      !form.description
    ) {
      alert(
        "Please complete Customer Name, Product Name and Description."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to save complaint");
      }

      const data = await response.json();

      dispatch(
        setComplaint({
          ...form,
          id: data.complaintId,
          severity: data.analysis.severity,
          aiAnalysis: data.analysis,
        })
      );

      setAnalysis(data.analysis);

      alert(
        `Complaint saved successfully!\n\nComplaint ID: ${data.complaintId}`
      );

      await loadComplaints();

      setPage("history");
    } catch (error) {
      console.error(error);

      alert(
        "Could not save the complaint to the backend."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     RESET
  ========================= */

  const resetForm = () => {
    setForm({ ...emptyForm });
    setAnalysis(null);
  };

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">⚕</div>

          <div>
            <strong>PharmaQMS</strong>
            <span>AI Quality System</span>
          </div>
        </div>

        <nav className="nav">

          <NavButton
            active={page === "dashboard"}
            onClick={() => setPage("dashboard")}
            icon="🏠"
            text="Dashboard"
          />

          <NavButton
            active={page === "complaint"}
            onClick={() => setPage("complaint")}
            icon="📝"
            text="Complaint Intake"
          />

          <NavButton
            active={page === "ai"}
            onClick={() => setPage("ai")}
            icon="🤖"
            text="AI Analysis"
          />

          <NavButton
            active={page === "history"}
            onClick={() => setPage("history")}
            icon="📋"
            text="Complaint History"
          />

          <NavButton
            active={page === "analytics"}
            onClick={() => setPage("analytics")}
            icon="📊"
            text="Analytics"
          />

        </nav>

        <div className="sidebar-bottom">

          <NavButton
            active={page === "settings"}
            onClick={() => setPage("settings")}
            icon="⚙️"
            text="Settings"
          />

          <div className="system-status">
            <span className="status-dot"></span>

            <div>
              <strong>System Online</strong>
              <small>AI Assistant Active</small>
            </div>
          </div>

        </div>

      </aside>

      {/* MAIN */}

      <div className="main-area">

        <header className="topbar">

          <div>
            <h1>AI Complaint Management System</h1>

            <p>
              Pharmaceutical Quality Management System
            </p>
          </div>

          <div className="status">
            <span className="status-dot"></span>
            AI Assistant Online
          </div>

        </header>

        {page === "dashboard" && (
          <Dashboard
            onNewComplaint={() => setPage("complaint")}
            onHistory={() => setPage("history")}
          />
        )}

        {page === "complaint" && (
          <ComplaintPage
            form={form}
            analysis={analysis}
            analyzing={analyzing}
            saving={saving}
            handleChange={handleChange}
            analyzeComplaint={analyzeComplaint}
            saveComplaint={saveComplaint}
            resetForm={resetForm}
          />
        )}

        {page === "ai" && (
          <AIPage
            analysis={analysis}
            onStart={() => setPage("complaint")}
          />
        )}

        {page === "history" && (
          <HistoryPage
            complaints={complaints}
            loading={historyLoading}
            error={historyError}
            onRefresh={loadComplaints}
            onAdd={() => setPage("complaint")}
          />
        )}

        {page === "analytics" && (
          <Analytics complaints={complaints} />
        )}

        {page === "settings" && <Settings />}

      </div>
    </div>
  );
}


/* =========================
   NAVIGATION
========================= */

function NavButton({
  active,
  onClick,
  icon,
  text,
}) {
  return (
    <button
      className={active ? "nav-item active" : "nav-item"}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </button>
  );
}


/* =========================
   DASHBOARD
========================= */

function Dashboard({
  onNewComplaint,
  onHistory,
}) {
  return (
    <main className="content">

      <div className="page-title">

        <div>
          <h2>Quality Dashboard</h2>

          <p>
            Pharmaceutical complaint monitoring
            and AI triage.
          </p>
        </div>

        <button
          className="primary"
          onClick={onNewComplaint}
        >
          + New Complaint
        </button>

      </div>

      <div className="stats-grid">

        <StatCard
          icon="📋"
          title="Total Complaints"
          value="128"
          change="+12 this month"
        />

        <StatCard
          icon="⏳"
          title="Pending Triage"
          value="24"
          change="Requires review"
        />

        <StatCard
          icon="⚠️"
          title="High Risk"
          value="8"
          change="Priority investigation"
        />

        <StatCard
          icon="✅"
          title="Resolved"
          value="96"
          change="75% resolution rate"
        />

      </div>

      <div className="dashboard-grid">

        <div className="card overview-card">

          <div className="card-header">

            <div>
              <h2>Complaint Overview</h2>

              <p>
                Current quality system status
              </p>
            </div>

          </div>

          <div className="overview-list">

            <div>
              <span>Product Quality</span>
              <strong>42%</strong>
            </div>

            <div>
              <span>Packaging Issues</span>
              <strong>27%</strong>
            </div>

            <div>
              <span>Adverse Events</span>
              <strong>18%</strong>
            </div>

            <div>
              <span>Other</span>
              <strong>13%</strong>
            </div>

          </div>

        </div>

        <div className="card quick-card">

          <h2>Quick Actions</h2>

          <button onClick={onNewComplaint}>
            📝 Register Complaint
          </button>

          <button onClick={onHistory}>
            📋 View Complaint History
          </button>

        </div>

      </div>

    </main>
  );
}


/* =========================
   COMPLAINT PAGE
========================= */

function ComplaintPage({
  form,
  analysis,
  analyzing,
  saving,
  handleChange,
  analyzeComplaint,
  saveComplaint,
  resetForm,
}) {
  return (
    <main className="content">

      <div className="page-title">

        <div>
          <h2>Complaint Intake</h2>

          <p>
            Register and analyze a pharmaceutical
            product complaint.
          </p>
        </div>

        <span className="badge">
          AI TRIAGE READY
        </span>

      </div>

      <div className="dashboard">

        <section className="card complaint-panel">

          <div className="section-title">
            1. CUSTOMER DETAILS
          </div>

          <div className="grid two">

            <Field
              label="Complaint Source"
              name="complaintSource"
              value={form.complaintSource}
              onChange={handleChange}
              placeholder="Email / Phone / Web"
            />

            <Field
              label="Customer Name"
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              placeholder="Enter customer name"
            />

            <Field
              label="Customer Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="customer@example.com"
            />

          </div>

          <div className="section-title">
            2. PRODUCT & BATCH IDENTIFICATION
          </div>

          <div className="grid two">

            <SelectField
              label="Product Type"
              name="productType"
              value={form.productType}
              onChange={handleChange}
              options={["API", "FDF"]}
            />

            <Field
              label="Product Name"
              name="productName"
              value={form.productName}
              onChange={handleChange}
              placeholder="e.g. Paracetamol Tablets"
            />

            <Field
              label="Strength / Grade"
              name="strength"
              value={form.strength}
              onChange={handleChange}
              placeholder="e.g. 500 mg"
            />

            <Field
              label="Batch / Lot Number"
              name="batchNumber"
              value={form.batchNumber}
              onChange={handleChange}
              placeholder="Enter batch number"
            />

            <Field
              label="Manufacturing Date"
              type="date"
              name="manufacturingDate"
              value={form.manufacturingDate}
              onChange={handleChange}
            />

            <Field
              label="Expiry Date"
              type="date"
              name="expiryDate"
              value={form.expiryDate}
              onChange={handleChange}
            />

            <Field
              label="Quantity Affected"
              name="quantityAffected"
              value={form.quantityAffected}
              onChange={handleChange}
              placeholder="e.g. 100 units"
            />

          </div>

          <div className="section-title">
            3. COMPLAINT DETAILS
          </div>

          <div className="grid two">

            <Field
              label="Complaint Type"
              name="complaintType"
              value={form.complaintType}
              onChange={handleChange}
              placeholder="Product quality / Packaging / Safety"
            />

            <Field
              label="Complaint Date"
              type="date"
              name="complaintDate"
              value={form.complaintDate}
              onChange={handleChange}
            />

          </div>

          <label className="field-label">
            Detailed Complaint Description
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the customer complaint in detail..."
            rows="5"
          />

          <div className="section-title">
            4. INITIAL ASSESSMENT
          </div>

          <div className="grid two">

            <SelectField
              label="Initial Severity"
              name="severity"
              value={form.severity}
              onChange={handleChange}
              options={[
                "Low",
                "Medium",
                "High",
                "Critical",
              ]}
            />

            <SelectField
              label="Priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              options={[
                "Low",
                "Medium",
                "High",
                "Critical",
              ]}
            />

          </div>

          <div className="actions">

            <button
              className="secondary"
              onClick={resetForm}
            >
              Reset Form
            </button>

            <button
              className="primary"
              onClick={saveComplaint}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Complaint"}
            </button>

          </div>

        </section>

        <section className="card assistant-panel">

          <div className="card-header">

            <div>
              <h2>
                AI Complaint Intake Assistant
              </h2>

              <p>
                AI-powered complaint analysis
              </p>
            </div>

            <span className="beta">
              AI
            </span>

          </div>

          <div className="ai-intro">

            <div className="ai-big-icon">
              🤖
            </div>

            <h3>
              Intelligent Complaint Analysis
            </h3>

            <p>
              The AI engine evaluates complaint
              information and recommends quality
              actions.
            </p>

          </div>

          <button
            className="analyze-button"
            onClick={analyzeComplaint}
            disabled={analyzing}
          >
            {analyzing
              ? "🔄 Analyzing Complaint..."
              : "✨ Analyze Complaint with AI"}
          </button>

          {analysis && (
            <AnalysisResult analysis={analysis} />
          )}

        </section>

      </div>

    </main>
  );
}


/* =========================
   AI RESULT
========================= */

function AnalysisResult({ analysis }) {
  return (
    <div className="analysis">

      <div className="analysis-heading">

        <div>
          <h3>AI Risk Assessment</h3>

          <p>
            Automated quality triage result
          </p>
        </div>

        <span
          className={`risk ${
            analysis.riskLevel?.toLowerCase() || "medium"
          }`}
        >
          {analysis.riskLevel}
        </span>

      </div>

      <div className="analysis-grid">

        <Result
          title="Completeness"
          value={analysis.completeness}
        />

        <Result
          title="Category"
          value={analysis.category}
        />

        <Result
          title="Risk Score"
          value={`${analysis.riskScore}/100`}
        />

      </div>

      <div className="ai-section">

        <h4>🔎 Risk Interpretation</h4>

        <p>
          Severity:{" "}
          <strong>{analysis.severity}</strong>
        </p>

        <p>
          Recommended action: {analysis.action}
        </p>

      </div>

      <div className="ai-section">

        <h4>🧠 Root Cause Recommendation</h4>

        <p>{analysis.rootCause}</p>

      </div>

      <div className="ai-section">

        <h4>🛠 CAPA Recommendation</h4>

        <p>
          <strong>Corrective:</strong>{" "}
          {analysis.capa?.corrective}
        </p>

        <p>
          <strong>Preventive:</strong>{" "}
          {analysis.capa?.preventive}
        </p>

      </div>

      <div className="ai-section">

        <h4>📄 Complaint Summary</h4>

        <p>{analysis.summary}</p>

      </div>

    </div>
  );
}


/* =========================
   AI PAGE
========================= */

function AIPage({
  analysis,
  onStart,
}) {
  return (
    <main className="content">

      <div className="page-title">

        <div>
          <h2>AI Analysis Center</h2>

          <p>
            Automated pharmaceutical complaint
            assessment.
          </p>
        </div>

      </div>

      {analysis ? (
        <div className="card large-card">
          <AnalysisResult analysis={analysis} />
        </div>
      ) : (
        <div className="card empty-state">

          <div>🤖</div>

          <h3>
            No AI analysis available
          </h3>

          <p>
            Submit a complaint to generate
            an AI risk assessment.
          </p>

          <button
            className="primary"
            onClick={onStart}
          >
            Start Complaint Analysis
          </button>

        </div>
      )}

    </main>
  );
}


/* =========================
   HISTORY
========================= */

function HistoryPage({
  complaints,
  loading,
  error,
  onRefresh,
  onAdd,
}) {
  return (
    <main className="content">

      <div className="page-title">

        <div>
          <h2>Complaint History</h2>

          <p>
            All registered pharmaceutical
            complaints from the database.
          </p>
        </div>

        <div className="history-actions">

          <button
            className="secondary"
            onClick={onRefresh}
          >
            🔄 Refresh
          </button>

          <button
            className="primary"
            onClick={onAdd}
          >
            + Add Complaint
          </button>

        </div>

      </div>

      {loading && (
        <div className="card empty-state">
          <div>⏳</div>
          <h3>Loading complaints...</h3>
          <p>
            Getting complaint records from the database.
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="card empty-state">

          <div>⚠️</div>

          <h3>
            Unable to load history
          </h3>

          <p>{error}</p>

          <button
            className="primary"
            onClick={onRefresh}
          >
            Try Again
          </button>

        </div>
      )}

      {!loading &&
        !error &&
        complaints.length === 0 && (

          <div className="card empty-state">

            <div>📋</div>

            <h3>
              No complaints yet
            </h3>

            <p>
              Submitted complaints will appear here.
            </p>

            <button
              className="primary"
              onClick={onAdd}
            >
              Add Complaint
            </button>

          </div>
        )}

      {!loading &&
        !error &&
        complaints.length > 0 && (

          <div className="card history-card">

            <div className="history-count">
              <strong>
                {complaints.length}
              </strong>{" "}
              complaint
              {complaints.length !== 1 ? "s" : ""} found
            </div>

            <div className="history-list">

              {complaints.map((item) => (

                <div
                  className="complaint-row"
                  key={item.id}
                >

                  <div>

                    <strong>
                      {item.productName ||
                        "Unnamed Product"}
                    </strong>

                    <span>
                      Complaint ID: #{item.id}
                    </span>

                    <span>
                      Customer:{" "}
                      {item.customerName ||
                        "Not provided"}
                    </span>

                  </div>

                  <div>

                    <span className="table-label">
                      Batch
                    </span>

                    <strong>
                      {item.batchNumber ||
                        "Not provided"}
                    </strong>

                  </div>

                  <div>

                    <span className="table-label">
                      Severity
                    </span>

                    <strong>
                      {item.severity ||
                        "Medium"}
                    </strong>

                  </div>

                  <div>

                    <span className="table-label">
                      Priority
                    </span>

                    <strong>
                      {item.priority ||
                        "Medium"}
                    </strong>

                  </div>

                  <div>

                    <span className="history-status">
                      Saved
                    </span>

                  </div>

                </div>

              ))}

            </div>

          </div>
        )}

    </main>
  );
}


/* =========================
   ANALYTICS
========================= */

function Analytics({ complaints }) {

  const total = complaints.length;

  const highRisk = complaints.filter(
    (item) =>
      item.severity === "High" ||
      item.severity === "Critical"
  ).length;

  const critical = complaints.filter(
    (item) => item.severity === "Critical"
  ).length;

  const lowRisk = complaints.filter(
    (item) => item.severity === "Low"
  ).length;

  return (
    <main className="content">

      <div className="page-title">

        <div>

          <h2>Quality Analytics</h2>

          <p>
            Complaint trends and risk distribution.
          </p>

        </div>

      </div>

      <div className="stats-grid">

        <StatCard
          icon="📈"
          title="Total Complaints"
          value={total}
          change="From database"
        />

        <StatCard
          icon="🔴"
          title="Critical"
          value={critical}
          change="Immediate action"
        />

        <StatCard
          icon="🟠"
          title="High Risk"
          value={highRisk}
          change="Investigation"
        />

        <StatCard
          icon="🟢"
          title="Low Risk"
          value={lowRisk}
          change="Normal monitoring"
        />

      </div>

      <div className="card analytics-card">

        <h3>
          Complaint Categories
        </h3>

        <Bar
          label="Product Quality"
          width="78%"
          value="42%"
        />

        <Bar
          label="Packaging"
          width="52%"
          value="27%"
        />

        <Bar
          label="Adverse Events"
          width="35%"
          value="18%"
        />

        <Bar
          label="Other"
          width="25%"
          value="13%"
        />

      </div>

    </main>
  );
}


function Bar({
  label,
  width,
  value,
}) {
  return (
    <div className="bar">

      <span>{label}</span>

      <div>
        <i style={{ width }}></i>
      </div>

      <strong>{value}</strong>

    </div>
  );
}


/* =========================
   SETTINGS
========================= */

function Settings() {
  return (
    <main className="content">

      <div className="page-title">

        <div>

          <h2>System Settings</h2>

          <p>
            AI Complaint Management System
            configuration.
          </p>

        </div>

      </div>

      <div className="settings-grid">

        <Setting
          icon="🤖"
          title="AI Engine"
          description="Complaint classification and risk assessment."
        />

        <Setting
          icon="⚕"
          title="Quality Management"
          description="Pharmaceutical complaint management module."
        />

        <Setting
          icon="🔐"
          title="System Security"
          description="Quality data and complaint records."
        />

        <Setting
          icon="📦"
          title="Product Module"
          description="API and Finished Dosage Form support."
        />

        <Setting
          icon="📊"
          title="Analytics"
          description="Complaint trends and quality metrics."
        />

        <Setting
          icon="⚙️"
          title="System Version"
          description="AI Complaint Management System Version 1.0 Prototype."
        />

      </div>

    </main>
  );
}


function Setting({
  icon,
  title,
  description,
}) {
  return (
    <div className="card setting-card">

      <h3>
        {icon} {title}
      </h3>

      <p>{description}</p>

      <span className="setting-status">
        ● Active
      </span>

    </div>
  );
}


/* =========================
   SMALL COMPONENTS
========================= */

function StatCard({
  icon,
  title,
  value,
  change,
}) {
  return (
    <div className="card stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <span>{title}</span>

        <strong>{value}</strong>

        <small>{change}</small>

      </div>

    </div>
  );
}


function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>

      <label className="field-label">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />

    </div>
  );
}


function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <div>

      <label className="field-label">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
      >

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}

      </select>

    </div>
  );
}


function Result({
  title,
  value,
}) {
  return (
    <div className="result-box">

      <span>{title}</span>

      <strong>{value}</strong>

    </div>
  );
}


export default App;