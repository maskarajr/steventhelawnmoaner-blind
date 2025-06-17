# Steven the Lawn Moaner 🌱

A Farcaster Frame app that brings a humorous twist to social interactions. Steven, the mysterious lawn moaner, watches and judges your lawn-related activities while maintaining a leaderboard of the most active users.

## Features

- 🖼️ Farcaster Frame Integration
- 📊 User Activity Leaderboard
- 🔍 User Search Functionality
- 🎭 Playful UI/UX Design
- 🔒 Secure Data Storage with Nillion SecretVault

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Shadcn/ui Components
- Neynar API for Farcaster Integration
- Nillion SecretVault for secure data storage

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Neynar API key (for Farcaster integration)
- Nillion SecretVault access and credentials
- Nillion Schema ID for leaderboard data

### Installation

1. Clone the repository:
```bash
git clone https://github.com/maskarajr/steventhelawnmoaner.git
cd steventhelawnmoaner
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```env
NEXT_PUBLIC_NEYNAR_API_KEY=your_neynar_api_key
NILLION_SCHEMA_ID=your_schema_id
NILLION_NODES=your_nodes_config
NILLION_ORG_CREDENTIALS=your_org_credentials
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## SecretVault Integration

The app uses Nillion SecretVault for secure storage of leaderboard data. The integration provides:

- Secure storage of user points and activity data
- Encrypted data access and retrieval
- Public and private leaderboard views
- Admin access control

The SecretVault implementation can be found in `app/lib/leaderboardVault.ts`.

## Frame Validation

The app includes proper frame validation according to Farcaster's specifications:
- Valid manifest file at `/.well-known/farcaster.json`
- Proper frame metadata in the layout
- Frame initialization using the Farcaster SDK

## Contributing

Feel free to contribute to this project by opening issues or submitting pull requests. All contributions are welcome!

## License

This project is licensed under the MIT License - see the LICENSE file for details.