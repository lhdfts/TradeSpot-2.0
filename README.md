# TradeStars Appointment System

A comprehensive appointment management system built with React, TypeScript, and Vite, integrated with Supabase for backend services.

## Features

-   **Appointment Management:** Create, edit, and track appointments.
-   **Automatic Distribution:** Smart assignment of "Closer" appointments based on workload and availability.
-   **User Roles:** Logic for SDRs and Closers.
-   **Metrics Dashboard:** Visual insights into performance.
-   **Calendar Integration:** View appointments in a calendar format.

## Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn
-   A Supabase project

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory based on the example below:

    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Database Setup:**
    Run the SQL scripts located in the `supabase/` folder in your Supabase project's SQL Editor to set up the schema and initial data.

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Deployment

Build the application for production:

```bash
npm run build
```
