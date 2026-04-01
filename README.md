# CineMind

CineMind is a personalized movie discovery platform that helps users find films they haven’t watched but will love. By combining **user ratings**, **watch history**, and **preferences**, CineMind generates tailored movie recommendations using machine learning.

---

## Table of Contents

- [Demo Version](#demo-version)
- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [ML & Recommendation System](#ml--recommendation-system)
- [License](#license)
- [Portfolio Demo Mode](#portfolio-demo-mode)

---

## Demo Version

Want a fast way to experience CineMind without signing up? Use the built-in demo route:

- **How it works**: opening `/demo` starts a temporary authenticated session automatically.  
- **Session type**: **read-only** (safe for portfolio/recruiter walkthroughs).  
- **What you can test**:  
  - Dashboard and profile views  
  - Discover/recommendation flow  
  - Navigation and UI/UX across tabs  
- **What is disabled in demo mode**:  
  - Adding or deleting movies  
  - Updating ratings  
  - Watchlist writes  
  - Account/profile mutation actions  
- **Visual indicator**: the app shows a **Demo Mode (Read-only)** banner while the session is active.  

This keeps the live demo stable while still showcasing the full product experience and recommendation pipeline.

---

## Overview

The goal of CineMind is to make movie discovery effortless and personalized. Users can:

- Rate or add movies to their profile.  
- View personalized movie recommendations.  
- Explore their rated movies and profile stats.  

The recommendations are driven by a **machine learning model** that predicts movies a user might enjoy based on their ratings and other metadata (genres, actors, directors, etc.).

---

## Key Features

- **User Authentication**: Login and signup system.  
- **Dashboard Tabs**:  
  - **Dashboard**: Overview and quick stats of your activity.  
  - **Discover**: ML-generated movie recommendations.  
  - **Rate Movies**: Add or rate movies to improve recommendations.  
  - **My Movies**: Library of your rated movies.  
  - **Profile**: Summary of your preferences and activity.
- The recommendations are driven by a **machine learning model** that predicts movies based on your previous ratings
- **Responsive Design**: Works on mobile, tablet, and desktop.  
- **Frontend**: React, Vite, Tailwind CSS  
- **Backend / ML**: Python, Flask/FastAPI, scikit-learn 
- **Database**: PostgreSQL
- **Machine Learning**: Collaborative filtering, content-based filtering, or hybrid models  

---

## ML & Recommendation System

- **Input Data**: User ratings, movie metadata (genres, actors, directors), watch history.  
- **Model Approach**:
  - **Collaborative Filtering**: Predicts user ratings based on similar users.  
  - **Content-Based Filtering**: Recommends movies similar to ones the user liked.  
  - **Hybrid**: Combines both approaches for higher accuracy.  
- **Training**:
  - Preprocessing of movie and user data.  
  - Model trained offline and served via an API.  
- **Serving Recommendations**:
  - Frontend requests recommendations from the backend API.  
  - Recommendations update as users rate/add movies.  

---

## Portfolio Demo Mode

Want recruiters to test the app without creating an account? Use the read-only demo strategy in [`docs/portfolio-demo-mode.md`](docs/portfolio-demo-mode.md).

## License

This project is licensed under the MIT License.

---
