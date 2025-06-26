# PES Library Connect

Welcome to PES Library Connect, a modern, full-stack library management system designed for the students and faculty of PES College of Engineering. This application provides a seamless digital experience for both library users and administrators.

## Features

### User Portal
- **Dashboard**: View your currently issued books at a glance.
- **Browse Library**: Search and filter the entire library catalog.
- **Issue & Return**: Issue available books and return them directly through the portal.
- **Renewals**: Request to renew your issued books (subject to rules like no overdue books).
- **Donate a Book**: Contribute to the library by submitting a donation request for a book you own.
- **History**: Track the status of your book donations.

### Admin Dashboard
- **Book Management**: A comprehensive CRUD interface to add, view, edit, and delete books from the library.
- **User Management**: View and manage user records in the system.
- **Donation Approvals**: Review and approve or reject book donations submitted by users.
- **Transaction Log**: A complete history of all library activities, including issues, returns, donations, and renewals.
- **Secure Access**: A separate login portal for administrators.

## Tech Stack

This project is built with a modern, robust, and scalable tech stack:

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI Library**: [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **Generative AI**: [Google AI & Genkit](https://firebase.google.com/docs/genkit) (for future AI features)

## Getting Started

Follow these instructions to get a local copy of the project up and running for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- A [Firebase](https://firebase.google.com/) project.

### 1. Installation

Clone the repository and install the dependencies.

```bash
npm install
```

### 2. Firebase Configuration

You need to connect the application to your Firebase project.

1.  Create a file named `.env.local` in the root of the project.
2.  Go to your Firebase project settings and create a new Web App.
3.  Copy the `firebaseConfig` object and populate `.env.local` with the following keys:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Deploy Firestore Indexes

The application uses several complex queries that require composite indexes in Firestore. Deploy the predefined indexes from the project:

```bash
# Make sure you are logged into the Firebase CLI
firebase deploy --only firestore:indexes
```
Wait for the indexes to finish building in the Firebase Console before proceeding.

### 4. Seed the Database (Optional)

To populate your Firestore database with some initial sample data (books), run the seed script:

```bash
npm run seed:firestore
```
This script adds a predefined list of books to your `books` collection in Firestore. It will skip any books that already exist based on their ISBN.

### 5. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application should now be running on [http://localhost:9002](http://localhost:9002).

## Available Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack.
- `npm run build`: Creates a production-ready build of the application.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase for potential errors.
- `npm run seed:firestore`: Seeds the Firestore database with initial book data.

## A Note on Firebase Security

The project includes a `firestore.rules` file with security rules to protect your data. These rules are crucial for a production environment. Ensure they are deployed (`firebase deploy --only firestore:rules`) and that you understand them before going live. The rules ensure that users can only access their own data, while administrators have broader permissions.
