# PES Library Connect

Welcome to **PES Library Connect**, a modern, full-featured Library Management System built for the PES College of Engineering. This application provides a seamless digital experience for both students and library administrators, simplifying book circulation, donations, and management.


## ✨ Features

This project is divided into two main portals: a User Dashboard for students/faculty and an Admin Dashboard for librarians.

### 👤 User Features
- **Authentication**: Secure signup and login for users.
- **Browse & Search**: A comprehensive catalog of all available library books with search and filter capabilities.
- **Issue Requests**: Users can request to issue any available book.
- **My Issued Books**: A personal dashboard to view all currently issued books, track due dates, and see overdue statuses.
- **Renew Requests**: Users can request to renew their issued books (if not overdue).
- **Return Requests**: Initiate a book return process, which is then finalized by an admin.
- **Book Donations**: A simple form for users to donate their books to the library, awaiting admin approval.
- **Donation History**: Track the status of all donated books (pending, approved, or rejected).

### 🛡️ Admin Features
- **Secure Admin Login**: Separate login portal for administrators.
- **Book Management**: Full CRUD (Create, Read, Update, Delete) functionality for the entire book catalog.
- **Issue Approvals**: View all pending book issue requests from users and approve or reject them.
- **Return Approvals**: View all pending book return requests and approve or reject them, making the book available again.
- **Donation Approvals**: Review and manage all book donation submissions from users.
- **User Management**: View all registered users in the system.
- **Transaction Log**: A complete, real-time log of all library activities (issues, returns, donations, etc.).

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/), [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **UI Components**: `lucide-react` for icons, `recharts` for charts (if any), `react-hook-form` for forms.

## 🛠️ Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/en) (v18 or newer recommended)
- `npm` or `yarn`

### 1. Set Up Environment Variables

    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
    ```

### 2. Install Dependencies

Navigate to the project directory in your terminal and run:

```bash
npm install
```

### 3. Deploy Firestore Indexes

The application uses several complex queries that require custom indexes in Firestore. Deploy them using the Firebase CLI:

```bash
# If you don't have it, install it globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes
firebase deploy --only firestore:indexes
```
*Note: It may take a few minutes for the indexes to build after deployment.*

### 4. Seed the Database (Optional but Recommended)

To populate your Firestore 'books' collection with initial mock data, run the seeding script:

```bash
npm run seed:firestore
```
This will add a large catalog of books to your database, making the library feel alive.

### 5. Run the Development Server

You're all set! Start the Next.js development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## 📜 Available Scripts

- `npm run dev`: Starts the development server with Turbopack.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts a production server.
- `npm run lint`: Runs the Next.js linter.
- `npm run seed:firestore`: Populates the Firestore database with initial book data.

