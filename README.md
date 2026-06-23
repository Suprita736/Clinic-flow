# ClinicFlow – Smart Queue Management for Clinics

## Overview

ClinicFlow is a real-time digital queue management system designed for clinics and healthcare centers. It replaces traditional paper-token systems with a modern, live-updating queue experience for both receptionists and patients.

Patients can track their position in the queue from their phones, receive turn notifications, and view estimated waiting times. Receptionists can manage multiple doctors, call patients, complete consultations, and monitor queue performance through a centralized dashboard.

---

## Problem Statement

Many clinics still rely on paper tokens and manual announcements.

This creates:

* Long waiting times
* Crowded waiting rooms
* Poor visibility for patients
* Inefficient queue management
* No performance analytics

ClinicFlow solves these issues with a real-time digital queue platform.

---

## Key Features

### Receptionist Dashboard

* Add patients and generate tokens automatically
* Assign patients to specific doctors
* Call Next functionality
* Complete consultations
* Pause and resume doctor queues
* Live queue monitoring

### Multi-Doctor Queue Management

* Independent queues per doctor
* Doctor availability management
* Active / Inactive doctor status
* Doctor administration panel
* Safe doctor deletion validation

### Patient Tracking

* Unique tracking code for every token
* Live queue status updates
* Estimated wait time calculation
* People ahead indicator
* Consultation completion status
* Mobile-friendly tracking interface

### Real-Time Updates

* Powered by Supabase Realtime
* Instant queue updates
* Live patient notifications
* Automatic status synchronization

### Patient Registry

* Centralized patient database
* Visit history tracking
* Preferred doctor tracking
* Autocomplete patient search
* Returning patient identification

### Analytics Dashboard

* Patients served
* Average consultation time
* No-shows and skipped patients
* Returning patient statistics
* Doctor performance metrics
* Most visited doctor insights

---

## System Architecture

### Frontend

* React
* TypeScript
* TanStack Router
* TanStack Query
* Tailwind CSS
* ShadCN UI

### Backend & Database

* Supabase
* PostgreSQL
* Supabase Realtime
* Row Level Security (RLS)

### Additional Tools

* Lucide Icons
* Sonner Toasts
* html2canvas
* PDF Generation Utilities

---

## Database Design

### Core Tables

#### doctors

Stores doctor information and queue state.

#### queue_entries

Stores patient queue records and token information.

#### patients

Stores clinic-wide patient history and visit statistics.

#### profiles

Stores authenticated user profiles.

#### user_roles

Role-based access control.

#### clinic_state

Legacy clinic configuration and queue metadata.

---

## Real-Time Workflow

1. Receptionist adds a patient.
2. Token is generated automatically.
3. Patient receives tracking link.
4. Queue updates in real time.
5. Receptionist clicks Call Next.
6. Patient screen instantly changes to "It's Your Turn".
7. Receptionist completes consultation.
8. Patient screen updates automatically.

---

## Screens

### Landing Page

Modern marketing website introducing ClinicFlow.

### Authentication

Secure login and registration system.

### Receptionist Dashboard

Operational queue management interface.

### Doctor Management

Create, edit, activate, deactivate, and manage doctors.

### Patient Registry

Clinic-wide patient history and search.

### Analytics Dashboard

Operational insights and performance monitoring.

### Patient Tracking Page

Live queue status view accessible via tracking link.

---

## Future Enhancements

* SMS Integration
* WhatsApp Notifications
* Appointment Scheduling
* Multi-Branch Support
* Doctor Portal
* AI-Based Wait Time Prediction
* QR Code Check-In
* Voice Announcements

---

## Installation

### Clone Repository

```bash
git clone https://github.com/Suprita736/serene-clinic-queue.git
cd serene-clinic-queue
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### Run Development Server

```bash
npm run dev
```

### Build Production Version

```bash
npm run build
```

---

## Team

Developed as a modern healthcare queue management solution to improve patient experience and clinic efficiency.

---

## License

This project is developed for educational, hackathon, and demonstration purposes.
