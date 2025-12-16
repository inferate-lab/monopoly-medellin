
# Monopoly Medellín

## Deployment Instructions

### Front-end (GitHub Pages)

This project uses Vite and is configured for deployment to GitHub Pages.

1.  **Repository Setup:** Ensure your repository name matches the `base` path in `vite.config.ts`. The current configuration is set to `/monopoly-medellin/`.
2.  **Workflow:** A GitHub Actions workflow `.github/workflows/deploy.yml` is included. It is triggered on pushes to the `main` or `master` branch.
3.  **Manual Build:**
    ```bash
    npm ci
    npm run build
    ```
    The output will be in the `dist` folder.

### Back-end (WebSocket Server)

The game server is located in the `server/` directory and is a Node.js application using `ws`.

**Local Development:**
```bash
cd server
npm install
npm run dev
```

**Deployment (Render/Fly/Railway):**
1.  **Build Command:** `cd server && npm install && npm run build`
2.  **Start Command:** `cd server && npm start`
3.  **Environment Variables:**
    *   `PORT`: (Optional) Port to run on (defaults to 3000).

### Client Configuration

To connect the client to your deployed WebSocket server, set the `VITE_WS_URL` environment variable during the client build.

**Example for GitHub Actions:**
You can add this to your repository secrets or the workflow file:
`VITE_WS_URL=wss://your-monopoly-server.onrender.com`

**Local Client-Server Connection:**
1.  Run Server: `cd server && npm run dev` (starts on port 3000)
2.  Run Client: `npm run dev`
3.  In `src/hooks/useGameState.tsx`, the default URL is set, but you can override it in your `.env.local`:
    `VITE_WS_URL=ws://localhost:3000`

## Features

*   **Multiplayer:** Real-time authoritative server using WebSockets.
*   **Game Rules:** Classic Monopoly rules including Property/Railroad/Utility rents, Housing, and Mortgages.
*   **Community Chest:** Full deck implementation with persistent state.
