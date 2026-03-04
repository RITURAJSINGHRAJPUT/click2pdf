# <p align="center">✨ Click2PDF: The Future of PDF Processing ✨</p>

<p align="center">
  <img src="public/assets/banner.png" alt="Click2PDF Banner" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blueviolet?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/tech-Vanilla_JS-yellow?style=for-the-badge" alt="Tech">
  <img src="https://img.shields.io/badge/backend-Node.js-brightgreen?style=for-the-badge" alt="Backend">
  <img src="https://img.shields.io/badge/cloud-Firebase-orange?style=for-the-badge" alt="Firebase">
</p>

---

## 🌌 Overview

**Click2PDF** is a cutting-edge, privacy-first PDF automation platform. Designed for speed and security, it empowers users to fill, merge, and automate PDF documents with a sleek, futuristic interface. No accounts, no data logging—just pure, high-performance PDF processing.

---

## 🚀 Quantum Features

### 🛠️ Advanced Editor
- **Precision Drag & Drop**: Pixel-perfect placement of interactive fields.
- **Rich Text Engine**: Full support for Bold, Italic, Underline, and Lists within PDF notes.
- **Signature Matrix**: Secure, locally-processed digital signatures.
- **Dynamic Fields**: Weekday pickers, 12-hour time selectors, and intelligent number formatting.

### 📦 Bulk Automation (NEW)
- **CSV/JSON Injection**: Fill hundreds of PDFs at once using data files.
- **Smart Mapping**: Industry-leading header-to-field auto-matching logic.
- **Zip-Batching**: Instant generation of ZIP archives containing all processed documents.

### ⚡ Performance Core
- **Background Dispatch**: Asynchronous email delivery via Brevo (Sendinblue) doesn't interrupt your workflow.
- **Precision Timers**: Real-time performance monitoring across all services.
- **Zero-Storage Philosophy**: Temporary files are vaporized automatically after processing.

---

## 🛠️ Tech Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript, HTML5 Core, CSS Motion Architecture |
| **Server** | Node.js Runtime, Express Framework |
| **Database** | Firebase Firestore (Credits & Metadata Only) |
| **Authentication** | Firebase Identity Platform |
| **PDF Engine** | `pdf-lib` (Synthesis), `pdf.js` (Neural Rendering) |
| **Mail** | Brevo HTTP API (Quantum background delivery) |

---

## 🏁 Quick Start

### 1. Initialize the Core
```bash
git clone <repository-url>
cd click2pdf
npm install
```

### 2. Configure Environment
Create a `.env` file at the root:
```env
# Brevo (Mail Engine)
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=noreply@nexus.com
EMAIL_FROM_NAME=Click2PDF Nexus

# Admin Control
ADMIN_EMAIL=sentinel@domain.com
```

### 3. Launch System
```bash
npm run dev
```
Navigate to `http://localhost:3000` to enter the interface.

---

## 🔒 Security Protocol

- **Local-First**: PDF merging and previewing happens on your machine whenever possible.
- **Vaporize Cleanup**: A dedicated background service cleans up temporary session files every 5 minutes.
- **Anonymized Processing**: No user data is stored on our servers beyond necessary session tokens.

---

## 📄 License

**MIT License** - Open for the future.

---

<p align="center">
  Built with ☕ and ⚡ by [Rituraj Singh Rajput](https://github.com/RITURAJSINGHRAJPUT)
</p>
