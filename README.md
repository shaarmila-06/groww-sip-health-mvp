# Groww-inspired SIP Health & Recovery MVP

A deployable web application concept for the case study. It has a responsive SIP details dashboard, AI Assist chat, server-side policy checks, OpenAI Responses API integration, and deterministic fallback guidance.

> This is an independent concept prototype, not an official Groww product and not connected to Groww, a bank, a payment gateway, or a user's investment account. All SIP details are fictional. It cannot create, pause, cancel, retry or redeem an SIP.

## Run locally
Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
# Optional: add your API key to .env; keep it private
npm start
```
Open http://localhost:3000

Without `OPENAI_API_KEY`, the app runs in rule-based demo mode. With a valid key, it uses the OpenAI Responses API from the server. The key is never sent to the browser.

## Deploy on Render (recommended)
1. Create a GitHub repository and upload the contents of this folder to its root.
2. Push/commit the files.
3. In Render, choose **New → Blueprint** and connect the GitHub repository. Render reads `render.yaml`.
4. When prompted, add `OPENAI_API_KEY` as a secret environment variable. Do not paste it into source code or commit `.env`.
5. Deploy. Render will install dependencies and run `npm start`.
6. Open the generated `onrender.com` URL. Check `/api/health` to see whether AI is configured.
7. Test in a private/incognito browser window.

You can deploy without an API key to demonstrate the UI and safe deterministic fallback. For real AI responses, create an API key in the OpenAI API dashboard and add it only as a server environment variable. API usage may incur charges.

## Deploy manually to Render
- New → Web Service → connect repo
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables: `OPENAI_API_KEY` (secret; optional for demo mode), `OPENAI_MODEL` (`gpt-6-luna` by default)
- Health check path: `/api/health`

## Included AI safeguards
- Server-side checks block requests asking for credentials / sensitive identifiers and specific investment recommendations.
- System instructions prohibit personalised investment advice, return predictions, false account-status claims, urgency and FOMO.
- AI only provides general SIP process education using a small approved knowledge base.
- Account-specific questions are directed to official support.
- If AI is not configured or the API fails, deterministic safe guidance is returned.

## Before calling this production-ready
This is a case-study MVP, not a production financial service. Before real users:
- Have compliance/legal review the approved content and all user journeys.
- Replace the small static knowledge base with versioned, reviewed official help content and citations.
- Add authentication, rate limiting, abuse monitoring, logging controls, privacy notice, retention policy and support escalation.
- Add an independently reviewed evaluation set and measure intent precision/recall, abstention correctness and harmful-answer rate.
- Do not connect bank, mandate, account or transaction APIs without explicit authorisation, security review and appropriate regulatory controls.

## Project structure
- `public/index.html` — responsive app UI
- `server.js` — API, safety checks, AI call and fallback
- `render.yaml` — Render Blueprint deployment
- `.env.example` — local environment variable template
