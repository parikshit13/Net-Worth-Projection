# Net Worth Projection

Interactive compounding swing-trade net worth projection, built with React + Recharts and deployed to GitHub Pages.

**Live site:** https://parikshit13.github.io/Net-Worth-Projection/

## Local development

```bash
npm install
npm run dev
```

## Deployment

Every push to `main` triggers the GitHub Actions workflow in `.github/workflows/deploy.yml`, which builds the site with Vite and publishes it to GitHub Pages.

One-time setup: in the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
