# 📋 Project Details — Speech-to-Transcript Platform

> **Audience:** Product Managers, Stakeholders, Non-Backend Developers  
> **Reading Time:** ~5–7 minutes  
> **Last Updated:** March 2026

---

## 1. Overview

### What Is This System?

The **Speech-to-Transcript Platform** is a backend system that allows users to upload audio recordings and automatically receive **text transcripts and translations** — without any manual effort.

Think of it like this: a user records a meeting or a training session on their phone, uploads it to the app, and within minutes they receive a clean written transcript — optionally translated into another language — that can also be saved directly to their **Notion workspace**.

### What Problem Does It Solve?

- Manually transcribing audio is time-consuming and error-prone.
- Teams often struggle to share and organize their recordings.
- Transcripts locked in one tool (like a recorder app) aren't useful elsewhere.

This platform solves all three by automating transcription, organizing recordings into shared folders, and pushing results to collaboration tools like Notion.

---

## 2. How the System Works (High-Level Flow)

Here's a simple step-by-step journey for a typical user:

1. **User logs in** using their Google account (secure, no password required).
2. **User uploads an audio file** (MP3, WAV, or M4A — up to 50 MB) and assigns it to a folder (called a "Section").
3. **The system stores the file** safely in cloud storage (Google Cloud Storage) or locally.
4. **A background job is created** and added to a processing queue. This relieves the user from waiting — they don't need to stay on the screen.
5. **A Worker service** picks up the job, fetches the audio, and sends it to Google's AI (Gemini API) for transcription.
6. **The transcript (and optional translation)** is saved to the database.
7. **The user is notified** (or can check status anytime) and can view, download, or sync the result to their Notion workspace.

```
User → Mobile App → API Server → Queue → Worker → Gemini AI → Database → User
```

---

## 3. Architecture Overview

The system is made up of four major layers that each have a distinct role:

| Layer | What It Is | Role |
|-------|-----------|------|
| **Mobile App (Frontend)** | The user-facing interface | Users record, upload, and view transcripts here |
| **API Server (Backend)** | The brain of the system | Handles requests, manages users, organizes jobs and data |
| **Worker Service** | A separate background processor | Handles heavy AI transcription work without slowing the API |
| **Database & Storage** | Where data lives | Stores user data, transcripts, audio files, and job status |
| **Queue System** | A traffic controller | Ensures jobs are processed in order, without overwhelming the system |
| **External Services** | Third-party tools | Google AI (transcription), Notion (export), Google Drive (folder sync) |

### Visual Flow

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│  Mobile App │ ───► │  API Server  │ ───► │  Queue (Redis) │
└─────────────┘      └──────────────┘      └────────┬───────┘
                             │                       │
                             ▼                       ▼
                      ┌──────────┐         ┌─────────────────┐
                      │ MongoDB  │◄────────│  Worker Service  │
                      └──────────┘         └────────┬────────┘
                             │                       │
                      ┌──────────────┐     ┌─────────▼──────┐
                      │ Google Cloud │     │   Gemini AI     │
                      │   Storage    │     │  (Transcription)│
                      └──────────────┘     └────────────────┘
```

---

## 4. Technologies Used (with Why)

### 🟢 Node.js + Express + TypeScript
**What it is:** Node.js is the engine that runs the backend server. Express is a framework that makes building web APIs fast. TypeScript adds type safety to catch bugs before they reach production.  
**Why we chose it:** Fast, widely used in production, excellent ecosystem for real-time and async applications. TypeScript significantly reduces bugs from incorrect data handling.

### 🍃 MongoDB
**What it is:** A database that stores information in flexible, document-like records (similar to JSON).  
**Why we chose it:** Our data (audio records, transcripts, users) has varying shapes and doesn't fit neatly in rigid spreadsheet-like tables. MongoDB handles this gracefully and scales horizontally.

### ⚡ Redis + BullMQ
**What it is:** Redis is an ultra-fast in-memory data store used as a queue. BullMQ is the library we use to manage job queues built on top of Redis.  
**Why we chose it:** When many users upload at once, we can't process everything immediately. Redis/BullMQ allows us to line up jobs, set priorities, and handle retries automatically — bringing order to high traffic.

### ☁️ Google Cloud Storage (GCS)
**What it is:** A cloud-based file storage service (like a very secure and scalable hard drive in the cloud).  
**Why we chose it:** Audio files are large. GCS provides reliable, fast, and affordable storage that scales as file volume grows.

### 🤖 Gemini API (Google AI)
**What it is:** Google's state-of-the-art AI model capable of processing audio and generating text.  
**Why we chose it:** Best-in-class accuracy for speech recognition and translation. Supports batch processing for handling large or multiple audio files efficiently.

### 🔐 Firebase / Google OAuth
**What it is:** A Google authentication service that lets users log in with their existing Google account.  
**Why we chose it:** No need to manage passwords. Users get a secure, familiar login experience, and we reduce the risk of credential-related security incidents.

### 📝 Notion API
**What it is:** Notion is a popular team workspace tool. The Notion API lets our system write data directly into a user's Notion pages.  
**Why we chose it:** Many teams already use Notion. Letting users sync transcripts there removes the need to copy-paste results manually.

### 🔗 n8n (Automation Webhooks)
**What it is:** An automation workflow tool that connects different services together.  
**Why we chose it:** When a new folder (subsection) is created in our app, n8n automatically provisions the corresponding folder in Google Drive — eliminating manual steps.

---

## 5. System Stability & Reliability

This section explains how the system stays up, stays fast, and recovers gracefully when things go wrong.

### 🚦 Queuing — Handling High Traffic Smoothly
Rather than processing audio the moment it's uploaded, all transcription jobs are placed into a **queue**. This means the system never gets overwhelmed — jobs wait their turn and are processed one at a time (or in batches), even during peak hours.

### 🔁 Retry Mechanisms — Handling Temporary Failures
If a transcription job fails (e.g., Gemini API is temporarily unavailable), the system **automatically retries** the job using an exponential backoff strategy — it waits a few seconds, retries, waits a bit longer, retries again. This prevents unnecessary failures from transient issues.

### ⚠️ Error Handling Strategy
Every error is caught, logged, and returned with a meaningful message. The API never exposes raw server errors to the client — instead, it returns structured error responses (e.g., "File format not supported" instead of a cryptic server crash message).

### 🛡️ Rate Limiting — Preventing Abuse
The API limits how many requests a single user can make in a given time window. This prevents any single user (or bot) from flooding the system and degrading performance for others.

### 📈 Load Handling — Horizontal Scaling
Both the **API server** and the **Worker service** are packaged as Docker containers. This means we can run multiple copies of each simultaneously (called horizontal scaling) — during peak loads, we simply spin up more workers.

### 🗄️ Database Reliability
- **Indexes** are applied on frequently queried fields (User ID, Section ID, job status) to keep queries fast even at scale.
- **Soft-delete (Trash):** Deleting a section doesn't immediately destroy data — it moves to trash first, giving a recovery window.
- **MongoDB Atlas** (in production) provides automated backups and high availability.

---

## 6. Performance & Scalability

### How the System Handles Growth

| Challenge | Our Approach |
|-----------|-------------|
| More users uploading simultaneously | Jobs queue up; workers scale horizontally |
| Large audio files (> 60 min) | Worker automatically chunks audio before sending to AI |
| Growing database size | MongoDB scales horizontally; indexes keep queries fast |
| Slow dependency (e.g., Gemini API) | Async processing; users aren't blocked waiting |
| High file storage needs | Google Cloud Storage scales infinitely at low cost |

### Key Design Decisions for Scalability

- **Decoupled Architecture:** The API server never does transcription — that's the Worker's job. This means both can scale independently based on their own load.
- **Priority Processing:** Jobs with higher priority (e.g., paid users or urgent content) are processed first, ensuring responsiveness where it matters most.
- **Stateless API:** The API server doesn't hold any session state — all context comes from the JWT token or database. This makes it trivial to run many API server instances behind a load balancer.

---

## 7. Key Features

- 🎙️ **Audio Upload** — Accepts MP3, WAV, and M4A files up to 50 MB
- 🤖 **AI Transcription** — Converts speech to text using Google's Gemini AI
- 🌐 **Translation** — Translates transcripts into the user's target language
- 📁 **Folder Organization** — Sections and Subsections (like Google Drive folders) to organize recordings
- 👥 **Collaboration & Sharing** — Share sections with teammates; control read/write permissions per collaborator
- 🗑️ **Trash & Recovery** — Soft-delete with recovery window before permanent deletion
- 📝 **Notion Sync** — Export transcript results directly to a Notion workspace with one click
- 🔗 **Google Drive Integration** — Automatically creates corresponding Drive folders via n8n automation
- 📊 **Job Status Tracking** — Real-time visibility into transcription job status (pending, processing, completed, failed)
- 🔐 **Secure Auth** — Google OAuth login with JWT-based API protection

---

## 8. Why This System Is Effective

### ✅ Scalability
The decoupled design (separate API and Worker services, Docker containers, a queue in the middle) means every component can scale on its own. Adding more users doesn't require a system redesign — just more workers.

### ⚡ Performance
Audio processing is offloaded to background workers, so the API responds instantly. Users never wait for a slow AI call to complete before getting a response. Large files are automatically chunked to prevent timeouts.

### 🔧 Maintainability
The codebase uses TypeScript for type safety, a clean layered architecture (routes → controllers → services → models), and Joi for input validation. Each module (auth, audio, sections, collaboration, Notion, trash) is fully self-contained and independently modifiable.

### 🙌 User Experience
- One-click Google login removes friction.
- Background processing means users can close the app and come back to their results.
- Notion integration brings transcripts into the tools teams already use.
- Collaboration features support real-world team workflows, not just individual use.

---

## 9. Future Scope

| Idea | Description |
|------|------------|
| **Batch Transcription (Gemini Batch API)** | Process multiple audio files in a single API call for cost efficiency |
| **Real-time Transcription** | Streaming live audio transcription during recording |
| **Advanced Analytics** | Track cost per section, hours processed per user, usage dashboards |
| **Multi-tenant Support** | Workspace-level isolation for enterprise customers |
| **S3 / Azure Blob Support** | Additional storage backends beyond Google Cloud Storage |
| **Webhooks for Third Parties** | Let external tools subscribe to transcript-complete events |
| **Mobile Push Notifications** | Notify users when their transcript is ready via push notification |

---

*This document is intended as a living reference. It should be updated as key architectural decisions evolve.*
