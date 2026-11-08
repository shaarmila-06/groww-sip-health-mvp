import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "12kb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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
