# PharmaQMS – AI Complaint Management System

An AI-powered Pharmaceutical Quality Management System designed to capture, analyze, classify, and track customer complaints related to pharmaceutical products.

## 📌 Project Overview

PharmaQMS is a web-based complaint management system that helps pharmaceutical quality teams register customer complaints and perform an initial AI-assisted quality assessment.

The system provides:

- Customer complaint registration
- Product and batch identification
- Complaint classification
- AI-assisted risk assessment
- Severity and priority assessment
- Root cause recommendations
- CAPA recommendations
- Complaint history
- Quality analytics dashboard
- REST API backend
- SQLite database

## ✨ Key Features

### 📝 Complaint Intake

Users can register complaints with:

- Complaint source
- Customer information
- Product type
- Product name
- Strength / grade
- Batch / lot number
- Manufacturing date
- Expiry date
- Quantity affected
- Complaint type
- Complaint description
- Initial severity
- Priority

### 🤖 AI Complaint Analysis

The system analyzes complaint descriptions and provides:

- Complaint completeness
- Complaint category
- Severity
- Risk score
- Risk level
- Recommended action
- Root cause recommendation
- Corrective Action recommendation
- Preventive Action recommendation
- Complaint summary

### 📋 Complaint History

Previously submitted complaints are stored in the backend database and displayed through the Complaint History section.

### 📊 Quality Analytics

The dashboard provides an overview of:

- Complaint volume
- Risk distribution
- Complaint categories
- High-risk complaints
- Critical complaints
- Resolution information

## 🏗️ System Architecture

```text
User
  │
  ▼
React + Vite Frontend
  │
  │ HTTP / REST API
  ▼
FastAPI Backend
  │
  ├── Complaint Analysis
  ├── Risk Assessment
  └── CAPA Recommendations
  │
  ▼
SQLite Database
