# AlphaPack MicroLending Website

A responsive microlending website prototype with borrower onboarding, application flow, verification pages, dashboard previews, and admin screens.

## Features

- Landing page focused on transparent microloans
- Borrower registration/login and application pages
- Verification and dashboard views
- Admin setup and admin dashboard pages
- Modern responsive UI with Bootstrap + custom styles

## Run locally

```bash
cd index.html
python3 -m http.server 8080
```

Then open: `http://localhost:8080/index.html`

## Publish on GitHub Pages

This repository includes a GitHub Actions workflow that deploys the `index.html/` directory to GitHub Pages whenever you push to `main`.

### One-time setup

1. Push this repository to GitHub.
2. In GitHub: **Settings → Pages**
3. Under **Build and deployment**, choose **Source: GitHub Actions**.
4. Ensure your default branch is `main`.

After that, each push to `main` auto-deploys the latest website.
