# VapeHub Pro POS - Serverless

A modern, serverless Point of Sale (POS) system built with React, TypeScript, and Supabase.

## Features

- 🛒 **Multi-Industry Support** - Customizable for any business type
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔐 **Secure Authentication** - Built-in user management
- 📊 **Analytics Dashboard** - Real-time sales insights
- 🖨️ **Receipt Printing** - WebUSB printer support
- 📦 **Inventory Management** - Stock tracking and alerts
- 💰 **Sales Management** - Complete POS functionality

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: React Query, Context API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/anasbalochh/vapehub-pro-pos-serverless.git
cd vapehub-pro-pos-serverless
```

2. Install dependencies:

```bash
cd frontend
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Configure your Supabase credentials in `.env.local`

5. Run the development server:

```bash
npm run dev
```

## Project Structure

```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Application pages
│   │   ├── lib/             # Utilities and API clients
│   │   ├── types/           # TypeScript type definitions
│   │   └── contexts/        # React contexts
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── README.md                # This file
└── package.json             # Root package configuration
```

## Branches

- `master` - Main branch with original code
- `feature/dynamic-field-system` - Enhanced dynamic field system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub.
