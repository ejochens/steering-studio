# Installing and Running Steering Studio

## Prerequisites

- **Node.js** v18.18 or later — [download here](https://nodejs.org/)
- **npm** (included with Node.js)
- An AI provider API key (OpenAI, Azure OpenAI, or Amazon Bedrock credentials)

## Quick Start

### 1. Clone or download the repository

```powershell
git clone <repository-url> steering-studio
Set-Location .\steering-studio
```

Or download and extract the ZIP from the repository.

### 2. Install dependencies

```powershell
npm install
```

### 3. Set up the database

Copy the example environment file and adjust if needed:

```powershell
Copy-Item .env.example .env
```

Then initialize the database:

```powershell
npm run setup
```

This runs `prisma generate` and `prisma db push` for you.

This creates a local SQLite database file (`dev.db`) in the project root. No external database server is needed.

### 4. Build and start the application

For production mode (recommended for general use):

```powershell
npm run build
npm run start
```

For development mode (if you plan to modify the code):

```powershell
npm run dev
```

### 5. Open the application

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Configure your AI provider

Go to **Settings → Provider** and enter your AI provider details:
- Provider type (OpenAI, Azure OpenAI, or Bedrock)
- Endpoint / region
- Model name
- API key or authentication method

Test the connection before saving.

## One-Line Setup Script

For convenience, you can run the full setup in one go:

```powershell
npm install; npm run setup; npm run build; npm run start
```

## Troubleshooting

### Port 3000 is already in use

Start on a different port:

```powershell
npx next start -p 3001
```

### Database errors after a schema update

If you pull new changes that include schema updates:

```powershell
npm run setup
```

If the schema has breaking changes (you'll see an error about incompatible changes), you may need to reset the database. **This deletes all local data:**

```powershell
npx prisma migrate reset
npx prisma generate
```

### Corporate proxy / TLS issues

If you're behind a corporate proxy with TLS inspection, set the corporate CA certificate in your `.env`:

```
NODE_EXTRA_CA_CERTS="C:\path\to\corporate-ca.pem"
```

## Updating

When pulling new versions:

```powershell
npm install
npm run setup
npm run build
npm run start
```

## Data Location

- **Database**: `dev.db` in the project root (SQLite file)
- **Configuration**: `.env` in the project root
- **Provider credentials**: Stored encrypted in the database, never exposed to the browser

## System Requirements

- Works on Windows, macOS, and Linux
- Tested primarily on Windows with PowerShell
- Any modern browser (Chrome, Edge, Firefox, Safari)
- ~200 MB disk space for dependencies
- No Docker or external services required
