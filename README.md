# Groww-inspired SIP Health & Discovery MVP

A deployable, independent product concept for a product case study. It includes:

- SIP Health dashboard with a safety-first SIP process assistant.
- Discovery Engine based on Slide 04's four public-evidence friction clusters: cash-flow & competing goals; payment / mandate uncertainty; action ambiguity; trust & information gaps.
- Searchable and filterable 36-record public research corpus, with record-level source context, evidence type, notes and limitations.
- Transparent keyword-based classifier for new comments, including matched cues and a human-review fallback.
- Server endpoints: `/api/health`, `/api/chat`, `/api/discovery/summary`, `/api/discovery/records`, `/api/discovery/classify`.

## Important evidence and AI limitations

The corpus contains 36 manually assembled public records (26 Reddit, 7 Apple App Store, 1 Google Play, 1 YouTube creator item and 1 Reddit social record). It is purposive and directional, not representative of Groww users or first-time SIP investors. Public questions and creator content are not proof of user actions. Cluster labels are a manual synthesis for this case study, not prevalence estimates.

The Discovery Engine classifier is a transparent keyword/rule-based analyst aid. It is not a generative AI model, is not trained or validated, and must not be described as measured AI accuracy. Low-signal samples are returned as needing human review. No external API key is required for Discovery Engine or SIP Health fallback mode.

The existing SIP chat can optionally use the OpenAI Responses API if an `OPENAI_API_KEY` is configured. This is optional; leave it unset to use the deterministic fallback. Never commit API keys to GitHub.

This is not an official Groww product and is not connected to Groww, a bank, a payment gateway or any investment account. It cannot view account status, make recommendations or initiate transactions. All dashboard account details are fictional.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm start
```

Open `http://localhost:3000` for SIP Health or `http://localhost:3000/discovery.html` for the Discovery Engine.

## Deploy on Render

The repository includes `render.yaml` for a Render Blueprint deployment. Connect the GitHub repository and deploy the web service. `OPENAI_API_KEY` is optional; leave it blank for no-key operation. The service serves the Discovery Engine and its evidence API from the same app.

## Updating an existing Render deployment

Commit the updated files to the same GitHub repository and `main` branch. Render should automatically detect the commit and redeploy the service. Check the latest deploy logs, then open `/discovery.html` on the service URL.
