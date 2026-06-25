/**
 * Cloudflare Pages Function: /subscribe
 * Accepts POST { email, source } from site.js
 * Forwards to beehiiv API (free tier handles subscriber creation)
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   BEEHIIV_API_KEY  — beehiiv API key (Settings → API Keys)
 *   BEEHIIV_PUB_ID   — beehiiv Publication ID (from your publication URL)
 *
 * If env vars are not set, returns 200 anyway (fail-open) so UX is never broken.
 */
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, error: "invalid email" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const apiKey = env.BEEHIIV_API_KEY;
  const pubId  = env.BEEHIIV_PUB_ID;

  // Fail-open: if not configured, return 200 so UX works before beehiiv is set up
  if (!apiKey || !pubId) {
    return new Response(JSON.stringify({ ok: true, note: "not configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const tags = buildTags(body);

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: false,
          utm_source: "nis2-instrumente.ro",
          utm_medium: "email-gate",
          utm_campaign: body.source || "inline",
          tags: [...tags, "seq_started"],
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    const ok = res.status === 200 || res.status === 201;

    // Send sequence email 0 immediately via Resend
    if (ok && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      const tier = tags.find(t => t === "score_low") ? "A"
                 : tags.find(t => t === "score_high") ? "C" : "B";
      await sendSequenceEmail0(email, tier, env).catch(() => {});
    }

    return new Response(JSON.stringify({ ok, status: res.status, data }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    // Network error — still return 200 so UX isn't broken
    return new Response(JSON.stringify({ ok: true, note: "upstream error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// Build Beehiiv tags from quiz answers for segmented email sequences
function buildTags(body) {
  const tags = [];
  const qa   = body.quiz_answers || {};
  const score = Number(qa.score) || 0;

  // Score tier — drives which nurture sequence subscriber receives
  if (score <= 3)      tags.push("score_low");
  else if (score <= 6) tags.push("score_mid");
  else                 tags.push("score_high");

  // Sector
  if (qa.sector) tags.push("sector_" + qa.sector);

  // Role
  if (qa.role)   tags.push("role_" + qa.role);

  // Missing items — used for personalised email subject lines + content
  if (qa.registered === "no" || qa.registered === "unknown") tags.push("missing_registration");
  if (qa.has_isms === "no" || qa.has_isms === "partial")      tags.push("missing_isms");
  if (qa.has_training === "no")                               tags.push("missing_training");
  if (qa.has_insurance === "no" || qa.has_insurance === "unknown") tags.push("missing_insurance");

  // Source tag
  if (body.source) tags.push("source_" + body.source.replace(/[^a-z0-9_]/gi, "_"));

  return tags.filter(Boolean);
}

// Immediate sequence email — sent the moment someone subscribes
async function sendSequenceEmail0(email, tier, env) {
  const EMAILS = {
  "A": {
    "subject": "Planul tău NIS2 — 3 zile, 3 pași",
    "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">
Tocmai ai completat quizul NIS2 — scorul tău arată că mai ai destul de lucru înainte de termen.
<br><br>
<strong>Vestea bună:</strong> Companiile în situații similare ajung la conformitate în 60–90 de zile dacă încep cu pașii potriviți.
</p>
<h3 style=\"font-family:sans-serif;color:#1e3a5f;\">Planul tău de start pe 3 zile:</h3>
<p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\">
<strong>Ziua 1 (30 min) — Verifică dacă ești sub incidența NIS2:</strong><br>
<a href=\"https://nis2-instrumente.ro/calculator.html\" style=\"color:#1e3a5f;\">Verifică dacă firma ta intră sub NIS2 →</a>
<br><br>
<strong>Ziua 2 (20 min) — Lansează un ISMS gratuit:</strong><br>
<a href=\"https://isms.online/\" style=\"color:#1e3a5f;\">ISMS.online — plan gratuit până la 25 angajați →</a>
<br><br>
<strong>Ziua 3 (30 min) — Instruiește managementul:</strong><br>
<a href=\"https://nis2-instrumente.ro/training-nis2.html\" style=\"color:#1e3a5f;\">Training NIS2 pentru echipa ta →</a>
<br><br>
<a href=\"https://nis2-instrumente.ro/#tracker-section\" style=\"color:#1e3a5f;\">Urmărește progresul în tracker-ul NIS2 →</a>
</p>"
  },
  "B": {
    "subject": "Scorul tău NIS2: început bun — iată ce mai lipsește până la 100%",
    "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">
Ai deja bazele NIS2 — e un semn bun. Îți lipsesc 2–3 elemente verificate cel mai frecvent de autoritatea de supraveghere.
</p>
<p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\">
<strong>Teste de penetrare (Art. 21(2)(f)):</strong><br>
<a href=\"https://nis2-instrumente.ro/testare-penetrare.html\" style=\"color:#1e3a5f;\">Ghid testare de penetrare NIS2 →</a>
<br><br>
<strong>MFA pentru conturi privilegiate (Art. 21(2)(i)):</strong><br>
<a href=\"https://nis2-instrumente.ro/instrumente/1password.html\" style=\"color:#1e3a5f;\">1Password Business — MFA + manager de parole →</a>
<br><br>
<strong>Securitatea lanțului de aprovizionare (Art. 21(2)(d)):</strong><br>
<a href=\"https://nis2-instrumente.ro/securitatea-lantului-de-aprovizionare.html\" style=\"color:#1e3a5f;\">Ghid securitatea furnizorilor →</a>
<br><br>
<a href=\"https://nis2-instrumente.ro/#tracker-section\" style=\"color:#1e3a5f;\">Marchează progresul în tracker-ul NIS2 →</a>
</p>"
  },
  "C": {
    "subject": "Scor excelent NIS2 — iată ultimul tău pas",
    "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">
Nivel ridicat de pregătire NIS2 — un scor cu adevărat bun. Un singur lucru rămas: validarea externă formală.
</p>
<p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\">
<strong>Test de penetrare</strong> — dovada că măsurile de securitate funcționează (Art. 21(2)(f)):<br>
<a href=\"https://cobalt.io/\" style=\"color:#1e3a5f;\">Cobalt.io →</a>
<br><br>
<strong>Certificare ISO 27001</strong> — validare externă a întregului ISMS:<br>
<a href=\"https://nis2-instrumente.ro/certificare-iso-27001.html\" style=\"color:#1e3a5f;\">Ghid certificare ISO 27001 →</a>
<br><br>
<a href=\"https://nis2-instrumente.ro/#tracker-section\" style=\"color:#1e3a5f;\">Bifează ultimele căsuțe din tracker →</a>
</p>"
  }
};

  const msg = EMAILS[tier] || EMAILS["B"];
  const footer = `<hr style="margin:2rem 0;border:none;border-top:1px solid #e5e7eb;">
<p style="font-family:sans-serif;font-size:12px;color:#9ca3af;">
  NIS2-Instrumente.ro &nbsp;|&nbsp;
  <a href="https://nis2-instrumente.ro/unsubscribe?email=${encodeURIComponent(email)}" style="color:#9ca3af;">Wypisz się</a>
</p>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      subject: msg.subject,
      html: msg.html + footer,
    }),
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
