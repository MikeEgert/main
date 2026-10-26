import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import nodemailer from "nodemailer";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8000;
const IS_PROD = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));

const MAIL_USER = process.env.GMAIL_USER;
const MAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const MAIL_TO = process.env.CONTACT_TO || MAIL_USER;
const MISSING_MAIL = !MAIL_USER || !MAIL_PASS;
const DRY_RUN = process.env.MAIL_DRY_RUN === "true" || MISSING_MAIL;

if (IS_PROD && MISSING_MAIL && process.env.MAIL_DRY_RUN !== "true") {
  console.error(
    "Missing GMAIL_USER / GMAIL_APP_PASSWORD in production. Refusing to start."
  );
  process.exit(1);
}

const transporter = DRY_RUN
  ? null
  : nodemailer.createTransport({
      service: "gmail",
      auth: { user: MAIL_USER, pass: MAIL_PASS },
    });

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
  );
  if (IS_PROD) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  next();
});

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map();

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now - entry.start > RATE_WINDOW_MS) hits.delete(ip);
  }
}, RATE_WINDOW_MS);
sweeper.unref();

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();

  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(ip, entry);

  if (entry.count > RATE_MAX) {
    return res.status(429).json({
      ok: false,
      error: "Too many messages from this address. Please try again later.",
    });
  }
  next();
}

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanLine(value, max) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

app.post("/api/contact", rateLimit, async (req, res) => {
  if (req.body.website) {
    return res.json({ ok: true });
  }

  const name = cleanLine(req.body.name, 100);
  const email = cleanLine(req.body.email, 200);
  const subject = cleanLine(req.body.subject, 150);
  const message = clean(req.body.message, 5000);

  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ ok: false, error: "All fields are required." });
  }
  if (!isEmail(email)) {
    return res
      .status(400)
      .json({ ok: false, error: "Please enter a valid email address." });
  }

  const text = `${message}\n\n— ${name} (${email})`;
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;line-height:1.6;color:#141413">
      <p style="white-space:pre-wrap;margin:0 0 20px">${escapeHtml(message)}</p>
      <hr style="border:none;border-top:1px solid #e4e4e0;margin:20px 0">
      <p style="margin:0;color:#737370;font-size:14px">
        From <strong style="color:#141413">${escapeHtml(name)}</strong>
        &lt;${escapeHtml(email)}&gt;
      </p>
    </div>
  `;

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Contact message received:");
    console.log({ name, email, subject, message });
    return res.json({
      ok: true,
      dryRun: true,
      message: "Dry run — message logged, not emailed.",
    });
  }

  try {
    await transporter.sendMail({
      from: `"megert site" <${MAIL_USER}>`,
      to: MAIL_TO,
      replyTo: `"${name}" <${email}>`,
      subject: `[Contact] ${subject}`,
      text,
      html,
    });
    console.log(`[SENT] "${subject}" from ${name} <${email}>`);
    res.json({ ok: true });
  } catch (err) {
    console.error("sendMail failed:", err.message);
    res.status(500).json({
      ok: false,
      error: "Could not send your message right now. Please email me directly.",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, uptime: process.uptime(), version: "1.0.0" });
});

const BLOCKED = new Set(["/server.js", "/package.json", "/package-lock.json"]);
app.use((req, res, next) => {
  if (
    BLOCKED.has(req.path) ||
    req.path.startsWith("/node_modules/") ||
    req.path.startsWith("/.")
  ) {
    return res.status(404).type("text/plain").send("Not found");
  }
  next();
});
app.use(
  express.static(__dirname, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (/\.(woff2|png|svg)$/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (/\.(css|js)$/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  })
);

app.use((req, res) => {
  res.status(404).type("text/plain").send("Not found");
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`megert running at http://localhost:${PORT}`);
  if (DRY_RUN) {
    console.log(
      "Mail is in DRY RUN mode — messages are logged, not emailed. " +
        "Set GMAIL_USER + GMAIL_APP_PASSWORD in .env to send for real."
    );
  }
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down.`);

  const forceExit = setTimeout(() => {
    console.warn("Shutdown timed out after 10s — forcing exit.");
    server.closeAllConnections();
    process.exit(1);
  }, 10000);
  forceExit.unref();

  server.close((err) => {
    if (err) {
      console.error("Error while closing server:", err);
      process.exit(1);
    }
    console.log("Server closed cleanly.");
    process.exit(0);
  });

  server.closeIdleConnections();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
