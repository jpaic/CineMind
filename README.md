# CineMind

CineMind is a personalized movie discovery platform that helps users find films they haven’t watched but will likely enjoy. By combining **user ratings**, **watch history**, and **movie metadata**, CineMind generates tailored recommendations through a dynamic recommendation algorithm.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Demo Version](#demo-version)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Recommendation System](#recommendation-system)
- [License](#license)

---

## Live Demo

https://cine-mind-one.vercel.app

---

## Overview

The goal of CineMind is to make movie discovery effortless and personalized. Users can:

- Rate and manage movies in their personal library  
- Receive tailored movie recommendations  
- Explore their activity through a clean dashboard interface  

The system continuously adapts recommendations based on user interaction and preferences.

---

## Demo Version

Want a fast way to experience CineMind without signing up? Use the built-in demo route:

- **How it works**: opening `/demo` starts a temporary authenticated session automatically  
- **Session type**: **read-only** (ideal for recruiters and quick previews)  
- **What you can test**:  
  - Dashboard and profile views  
  - Recommendation flow  
  - Navigation and UI/UX  
- **What is disabled**:  
  - Adding or deleting movies  
  - Updating ratings  
  - Watchlist modifications  
  - Profile/account changes  
- **Visual indicator**: a **Demo Mode (Read-only)** banner is shown  

This ensures a stable and consistent demo experience.

---

## Key Features

- **Authentication System**  
  Secure login and signup using JWT-based authentication  

- **Personalized Recommendations**  
  Dynamic suggestions based on user ratings and movie attributes  

- **Dashboard Interface**  
  - Overview of user activity  
  - Quick stats and insights  

- **Movie Management**  
  - Add and rate movies  
  - Maintain a personal movie library  

- **Responsive Design**  
  Fully optimized for mobile, tablet, and desktop  

- **Modern UI/UX**  
  Clean and intuitive interface built with modern frontend tools  

---

## Tech Stack

### Frontend
- React 19  
- Vite  
- Tailwind CSS  

### Backend / API
- Node.js  
- Express.js  

### Database
- PostgreSQL (Neon Serverless)  

### Utilities & Services
- Resend (email service)  
- js-cookie (client-side session handling)  
- PapaParse (CSV data processing)  

### Deployment
- Vercel (Frontend + Backend)

---

## Recommendation System

CineMind uses a **custom recommendation algorithm** to generate personalized suggestions.

### Input Data
- User ratings  
- Watch history  
- Movie metadata (genres, actors, etc.)  

### Approach
- Scores movies based on similarity to user preferences  
- Prioritizes genres and patterns from highly rated content  
- Updates dynamically as users rate more movies  

### Delivery
- Recommendations are generated via the backend API  
- The frontend fetches and displays results in real time  

---

## License

This project is licensed under the MIT License.

---
