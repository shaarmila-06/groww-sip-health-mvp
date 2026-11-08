import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "12kb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const DISCOVERY_RECORDS = JSON.parse(await readFile(path.join(__dirname, "data_public_records.json"), "utf8"));

const BLOCK_PATTERNS = [
  /\b(otp|one[- ]time password|upi pin|password|passcode)\b/i,
  /\b(pan number|full account number|bank account number|card number)\b/i,
  /\b(which fund should i buy|recommend (a )?fund|best mutual fund|stock tip|buy or sell|predict returns)\b/i
];

const SYSTEM = `You are SIP Health Assist, a careful support assistant inside a fictional Groww-inspired product concept.
Your job is to explain mutual-fund SIP processes in plain, neutral language.
You are NOT Groww, do not claim to see a user's account, bank, mandate, payment, portfolio or transaction.
You cannot initiate, cancel, pause, redeem, retry or modify anything.
Never recommend or rank funds, stocks or securities; never predict returns or give personalised investment advice.
Never use fear, FOMO, urgency or pressure to keep investing. A user may pause, reduce or stop an SIP if it suits their circumstances.
Only provide general process education using this approved knowledge:
- A failed SIP debit may have multiple causes: insufficient available balance, mandate status, bank-side decline, or processing issue. The actual reason must be checked in the user's official SIP details / bank statement / mandate information.
- Pause, skip, amount change and cancellation are distinct actions. Availability and cut-off timing depend on the platform, mandate and fund process. Direct users to review the official confirmation screen and effective date.
- Cancelling a SIP generally stops future scheduled investments; it does not automatically redeem units already purchased. Redemption is a separate action and may involve scheme-specific exit load, tax and settlement timelines; direct users to official scheme/platform disclosures.
- Do not assume a failed instalment means another debit will or will not be attempted.
- If account-specific status is required, say you cannot access it and direct the user to official in-app support.
- Do not ask for or accept OTP, UPI PIN, passwords, PAN, full bank details or portfolio screenshots.
Answer in 2-5 concise sentences or a short checklist. If the request is outside scope, abstain and direct to official support or a registered adviser as appropriate.`;

function localFallback(message) {
  const q = message.toLowerCase();
  if (/fail|debit|deduct|mandate|payment|bank balance/.test(q)) {
    return "A failed SIP debit can have several causes, including available balance, mandate status, a bank-side decline or a processing issue. I can’t see which reason applies to your account. Check the exact failure reason in your official SIP details, then compare it with your bank statement and mandate status. If they do not match, contact official in-app support.";
  }
  if (/pause|skip|miss one|instalment|installment/.test(q)) {
    return "Skip, pause and cancel are different actions. Check your SIP details to see which options are available, whether the action affects one instalment or future instalments, and the effective date. Do not assume a mandate block will skip only one payment. This demo cannot submit a request.";
  }
  if (/budget|salary|afford|expense|reduce|amount|cash flow/.test(q)) {
    return "Your SIP amount should fit your current circumstances; there is no need to continue an amount that no longer works for you. Review the available amount-change, pause or schedule options in your official SIP details, and check when any change takes effect.";
  }
  if (/cancel|stop future|discontinue|withdraw|redeem/.test(q)) {
    return "Cancelling a SIP generally stops future scheduled investments; it does not automatically sell units already purchased. Redemption is a separate action and may involve scheme-specific exit load, tax and settlement timelines. Review official disclosures before taking either action.";
  }
  return "I can help explain SIP debit failures, pause or skip options, changes to your monthly amount, and cancellation versus redemption. I can’t inspect your account or take action. Please rephrase around one of those topics, or use official in-app support for account-specific questions.";
}



const DISCOVERY_CLUSTERS = {
  cashflow: { label: "Cash-flow & competing goals", description: "Affordability, emergencies, debt, life events and changed priorities.", cues: ["emergency", "cash flow", "cashflow", "salary", "job", "debt", "loan", "expense", "afford", "urgent", "goal", "priority", "medical", "family", "income", "budget", "stop because", "reduce amount"] },
  payment: { label: "Payment / mandate uncertainty", description: "Failed debits, AutoPay setup, mandate status and payment communication.", cues: ["failed sip", "sip failed", "debit failed", "autopay", "auto pay", "mandate", "bank debit", "payment failed", "payment failure", "instalment failed", "installment failed", "deducted", "not debited", "nach", "upi mandate"] },
  actions: { label: "Action ambiguity", description: "Confusion between skip, pause, cancel, redeem, restart or change amount.", cues: ["pause", "paused", "skip", "cancel", "cancellation", "redeem", "redemption", "withdraw", "restart", "resume", "stop sip", "stop my", "switch fund", "change amount", "reduce sip"] },
  trust: { label: "Trust & information gaps", description: "Performance expectations, app reliability, support, fees and unclear information.", cues: ["returns", "performance", "loss", "market", "crash", "app stuck", "app not working", "support", "fraud", "fee", "charges", "expense ratio", "information", "confused", "reliable", "outage", "loading", "trust", "underperform"] }
};

function classifyDiscoveryText(raw) {
  const text = raw.toLowerCase();
  const scores = Object.entries(DISCOVERY_CLUSTERS).map(([key, item]) => ({
    key, label: item.label,
    matches: item.cues.filter(cue => text.includes(cue)),
    score: item.cues.filter(cue => text.includes(cue)).reduce((sum, cue) => sum + (cue.includes(" ") ? 2 : 1), 0)
  })).sort((a,b) => b.score-a.score);
  const best = scores[0];
  const second = scores[1];
  if (!best || best.score === 0) return { status: "needs_review", label: "Unclear / needs human review", confidence: "Low", explanation: "The text does not contain a strong signal for one of the four discovery clusters. Keep it unclassified rather than forcing a label.", candidates: scores.slice(0,2).map(x => ({ label: x.label, score: x.score })), matchedCues: [] };
  const confidence = best.score >= 4 && best.score - second.score >= 2 ? "Higher" : best.score >= 2 && best.score > second.score ? "Moderate" : "Low";
  return { status: "classified", key: best.key, label: best.label, confidence, explanation: `Matched ${best.matches.length} cue(s): ${best.matches.slice(0,5).join(", ")}. This is a lightweight keyword signal, not a validated AI prediction or proof of behaviour.`, matchedCues: best.matches.slice(0,8), candidates: scores.slice(0,2).map(x => ({ label: x.label, score: x.score })) };
}

app.get("/api/discovery/summary", (_req, res) => {
  const counts = Object.fromEntries(Object.keys(DISCOVERY_CLUSTERS).map(key => [key, DISCOVERY_RECORDS.filter(r => r.cluster === key).length]));
  const sources = Object.fromEntries([...new Set(DISCOVERY_RECORDS.map(r => r.source))].map(source => [source, DISCOVERY_RECORDS.filter(r => r.source === source).length]));
  res.json({ total: DISCOVERY_RECORDS.length, counts, sources, clusters: DISCOVERY_CLUSTERS, evidenceNote: "36 manually assembled public records: 26 Reddit, 7 Apple App Store, 1 Google Play, 1 YouTube creator item and 1 Reddit social record. Purposive and directional; not representative of Groww users or first-time SIP investors." });
});

app.get("/api/discovery/records", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().slice(0,160);
  const cluster = String(req.query.cluster || "all");
  const source = String(req.query.source || "all");
  const type = String(req.query.type || "all");
  let records = DISCOVERY_RECORDS.filter(r => {
    const haystack = [r.title,r.text,r.theme,r.notes,r.source,r.evidenceType].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) && (cluster === "all" || r.cluster === cluster) && (source === "all" || r.source === source) && (type === "all" || r.evidenceType === type);
  });
  res.json({ total: records.length, records });
});

app.post("/api/discovery/classify", (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 1200) return res.status(400).json({ error: "Enter a text sample under 1,200 characters." });
  res.json({ result: classifyDiscoveryText(text), mode: "transparent_keyword_classifier" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(openai), model: openai ? MODEL : null });
});

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 700) {
    return res.status(400).json({ error: "Enter a question under 700 characters." });
  }
  if (BLOCK_PATTERNS.some((pattern) => pattern.test(message))) {
    return res.json({
      answer: "For your safety, do not share OTPs, UPI PINs, passwords, PAN or full bank details here. I cannot access your account or provide personalised investment recommendations. Use official in-app support for account-specific help.",
      mode: "safe_fallback",
      intent: "sensitive_or_advice"
    });
  }
  if (!openai) {
    return res.json({ answer: localFallback(message), mode: "rule_based_fallback", intent: "fallback" });
  }
  try {
    const response = await openai.responses.create({
      model: MODEL,
      instructions: SYSTEM,
      input: message,
      max_output_tokens: 350
    });
    const answer = (response.output_text || "").trim();
    if (!answer) throw new Error("Empty model response");
    return res.json({ answer, mode: "ai", model: MODEL });
  } catch (error) {
    console.error("AI request failed:", error?.message || error);
    return res.json({
      answer: localFallback(message),
      mode: "rule_based_fallback",
      intent: "fallback",
      notice: "AI is temporarily unavailable; showing general guidance."
    });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`SIP Health MVP listening on ${PORT}`));
