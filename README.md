# Hirearn Admin Web Panel

A Next.js web application for managing the Hirearn platform. This admin panel provides a better interface for managing users, payments, disputes, and other administrative tasks that are difficult to handle on mobile devices.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
# Or for production:
# NEXT_PUBLIC_API_URL=https://backend-hirearn.onrender.com/api
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Features

- **Dashboard**: Overview of key metrics and quick actions
- **User Management**: Manage users, suspend, activate, or put on hold
- **KYC Review**: Review and approve pending KYC verifications
- **Payment Management**: Monitor payments, payouts, and settlements
- **Dispute Management**: Handle disputes between workers and employers
- **Withdrawal Processing**: Process worker withdrawal requests
- **Audit Logs**: Track all admin actions
- **Settlement Monitor**: Monitor and retry failed settlements

## Project Structure

```
web/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── (admin)/           # Admin dashboard routes
│   ├── api/               # API routes (if needed)
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
├── lib/                   # Utilities and API client
│   ├── api/              # API functions (reused from mobile)
│   └── utils/            # Helper functions
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions
```
