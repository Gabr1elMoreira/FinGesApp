# FinGes Backend

Simple Backend for Personal Finance App, built with Node.js, Express, Prisma, and PostgreSQL.

## Prerequisites

- Node.js (v18+)
- PostgreSQL (Docker or Local)

## Setup

1.  **Install Dependencies**
    ```bash
    cd Backend
    npm install
    ```

2.  **Environment Variables**
    Copy `.env.example` to `.env` and update `DATABASE_URL` with your Postgres credentials.
    ```bash
    cp .env.example .env
    ```

3.  **Database Setup**
    Ensure your Postgres database is running. Then run migrations:
    ```bash
    npx prisma migrate dev --name init
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Server will start at `http://localhost:3000`.

## API Endpoints

-   `POST /auth/register`: Create account
-   `POST /auth/login`: Login
-   `GET /transactions`: Get all transactions (includes recurrence generation)
-   `POST /transactions`: Add transaction
-   `PUT /users/settings`: Update user category settings

## Project Structure

-   `src/prisma`: DB Client
-   `src/controllers`: Request Logic
-   `src/middleware`: Auth middleware
-   `src/routes`: API Definitions
