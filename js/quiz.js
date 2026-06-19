/* KSC/NIS2 Compliance Quiz v2 — quiz.js */

(function () {
  "use strict";

  const REPORT_ENDPOINT    = "/generate-report";
  const SUBSCRIBE_ENDPOINT = "/subscribe";

  // ── Affiliate + tool links ──────────────────────────────────────────────────
  const LINKS = {
    reglyze:      { name: "Reglyze",      url: "https://reglyze.com",         review: "narzedzia/reglyze.html" },
    secfix:       { name: "Secfix",       url: "https://secfix.com",          review: "narzedzia/secfix.html" },
    isms_online:  { name: "ISMS.online",  url: "https://isms.online",         review: "narzedzia/isms-online.html" },
    knowbe4:      { name: "KnowBe4",      url: "https://knowbe4.com",         review: "training-nis2.html" },
    hiscox:       { name: "Hiscox Cyber", url: "https://hiscox.com",          review: "asigurare-cyber.html" },
    onepassword:  { name: "1Password",    url: "https://1password.com",       review: "narzedzia/1password.html" },
    nordlayer:    { name: "NordLayer",    url: "https://nordlayer.com",       review: "narzedzia/nordlayer.html" },
    cobalt:       { name: "Cobalt.io",    url: "https://cobalt.io",           review: "testare-penetrare.html" },
    bsi:          { name: "BSI ISO 27001",url: "https://bsigroup.com/pl-PL/", review: "certificare-iso-27001.html" },
  };

  // ── Tool recommendation by sector + budget ─────────────────────────────────
  const ISMS_RECS = {
    "annex1:free":  "reglyze",   "annex1:low":   "isms_online",
    "annex1:mid":   "secfix",    "annex1:high":  "secfix",
    "annex2:free":  "reglyze",   "annex2:low":   "reglyze",
    "annex2:mid":   "isms_online","annex2:high":  "secfix",
    "other:free":   "reglyze",   "other:low":    "reglyze",
    "other:mid":    "reglyze",   "other:high":   "isms_online",
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    step: 0,
    answers: {},
    score: 0,
    missing: [],
    email: null,
  };

  // ── Questions ──────────────────────────────────────────────────────────────
  const questions = [
    {
      id: "sector",
      title: "În ce sector activează compania dvs.?",
      hint: "Selectați sectorul care descrie cel mai bine activitatea principală.",
      options: [
        { value: "annex1", icon: "⚡", label: "Sector esențial (Anexa I)",
          sub: "Energie, transport, servicii bancare, finanțe, sănătate, apă, infrastructură digitală, administrație publică" },
        { value: "annex2", icon: "📦", label: "Sector important (Anexa II)",
          sub: "Poștă, gestionarea deșeurilor, chimie, alimentație, producție industrială, furnizori de servicii digitale, IMM-uri/IT" },
        { value: "other", icon: "🏗️", label: "Alt sector",
          sub: "Construcții, comerț cu amănuntul, gastronomie, educație privată, altele" },
      ]
    },
    {
      id: "size",
      title: "Câți angajați are compania dvs.?",
      hint: "Includeți toți angajații și colaboratorii.",
      options: [
        { value: "micro",  icon: "👤", label: "Mai puțin de 50 de angajați",  sub: "Micro / întreprindere mică" },
        { value: "medium", icon: "👥", label: "50–249 de angajați",            sub: "Întreprindere mijlocie" },
        { value: "large",  icon: "🏢", label: "250 sau mai mulți angajați",    sub: "Întreprindere mare" },
      ]
    },
    {
      id: "revenue",
      title: "Care este cifra de afaceri anuală a companiei dvs.?",
      hint: "Venituri anuale sau totalul bilanțului.",
      options: [
        { value: "small",  icon: "💶", label: "Sub 10 milioane EUR pe an",     sub: "Micro / întreprindere mică" },
        { value: "medium", icon: "💰", label: "10–50 milioane EUR pe an",      sub: "Întreprindere mijlocie" },
        { value: "large",  icon: "💎", label: "Peste 50 milioane EUR pe an",   sub: "Întreprindere mare" },
      ]
    },
    {
      id: "budget",
      title: "Care este bugetul dvs. anual pentru conformitatea NIS2/Legea nr. 362/2006 modificată?",
      hint: "Vom adapta instrumentele recomandate la posibilitățile dvs. financiare.",
      options: [
        { value: "free", icon: "🆓", label: "Caut o soluție gratuită",        sub: "Plan gratuit sau cost unic de implementare" },
        { value: "low",  icon: "💵", label: "Până la 1.000 RON pe an (~€200)", sub: "Instrument SaaS de bază" },
        { value: "mid",  icon: "💳", label: "1.000–6.000 RON pe an",          sub: "Platformă completă de conformitate" },
        { value: "high", icon: "🏦", label: "Peste 6.000 RON pe an",          sub: "Soluție enterprise" },
      ]
    },
    {
      id: "registered",
      title: "Compania dvs. este deja înregistrată conform Legea nr. 362/2006 modificată?",
      hint: "Termen de înregistrare: conform transpunerii române NIS2. Acesta este primul dvs. obligație.",
      options: [
        { value: "yes",  icon: "✅", label: "Da, ne-am înregistrat deja",         sub: "Autoidentificarea a fost efectuată" },
        { value: "no",   icon: "❌", label: "Nu, nu am făcut încă acest lucru",   sub: "Prioritatea nr. 1 — termen: conform transpunerii române NIS2" },
        { value: "unknown", icon: "❓", label: "Nu știu / nu sunt sigur",         sub: "Vom verifica împreună" },
      ]
    },
    {
      id: "has_isms",
      title: "Aveți implementat un sistem de management al securității (ISMS)?",
      hint: "ISMS reprezintă un set de politici, proceduri și controale de securitate cibernetică — impus de Art. 21 NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Da, avem un ISMS funcțional",          sub: "Politici și proceduri de securitate documentate" },
        { value: "partial", icon: "🔄", label: "Lucrăm la implementare",              sub: "Este în curs — dar nu a fost finalizat încă" },
        { value: "no",      icon: "❌", label: "Nu, nu avem nimic în acest domeniu",  sub: "Niciun sistem de management al securității" },
      ]
    },
    {
      id: "has_training",
      title: "Angajații și conducerea au urmat cursuri de securitate cibernetică?",
      hint: "Instruirea conducerii este o obligație legală conform Art. 20 NIS2.",
      options: [
        { value: "yes", icon: "✅", label: "Da, avem cursuri regulate",              sub: "Angajații și conducerea sunt instruiți" },
        { value: "no",  icon: "❌", label: "Nu, nu avem cursuri în acest domeniu",   sub: "Instruirea conducerii este o obligație legală conform Legea nr. 362/2006 modificată" },
      ]
    },
    {
      id: "has_insurance",
      title: "Compania dvs. deține o asigurare împotriva riscurilor cibernetice?",
      hint: "Asigurarea cyber transferă riscul rezidual și reprezintă un element al managementului riscului NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Da, avem asigurare cyber",              sub: "Riscul este acoperit" },
        { value: "no",      icon: "❌", label: "Nu, nu avem asigurare",                sub: "Obținerea unui deviz online durează 20 de minute" },
        { value: "unknown", icon: "❓", label: "Nu știu / nu am auzit de aceasta",     sub: "Vă vom explica ce este și cât costă" },
      ]
    },
    {
      id: "role",
      title: "Ce rol îndepliniți în companie?",
      hint: "Vom adapta planul la responsabilitățile și competențele dvs. decizionale.",
      options: [
        { value: "ceo",        icon: "👔", label: "Proprietar / CEO / Consiliu de administrație", sub: "Răspundeți de decizii și buget" },
        { value: "it",         icon: "💻", label: "IT Manager / CTO / CISO",                     sub: "Răspundeți de implementarea tehnică" },
        { value: "compliance", icon: "📋", label: "Conformitate / Juridic",                      sub: "Răspundeți de conformitatea legală" },
        { value: "cfo",        icon: "💰", label: "CFO / Director Financiar",                    sub: "Răspundeți de buget și riscul financiar" },
      ]
    },
  ];

  const TOTAL = questions.length;

  // ── Score calculation ──────────────────────────────────────────────────────
  function computeScore() {
    const a = state.answers;
    let score = 2; // base: everyone has some basics
    const missing = [];

    if (a.registered === "yes")        { score += 2; }
    else                               { missing.push("registration"); }

    if (a.has_isms === "yes")          { score += 3; }
    else if (a.has_isms === "partial") { score += 1; missing.push("isms"); }
    else                               { missing.push("isms"); }

    if (a.has_training === "yes")      { score += 2; }
    else                               { missing.push("training"); }

    if (a.has_insurance === "yes")     { score += 1; }
    else                               { missing.push("insurance"); }

    score = Math.min(10, Math.max(1, score));
    state.score   = score;
    state.missing = missing;
    return { score, missing };
  }

  function computeScope() {
    const { sector, size, revenue } = state.answers;
    if (sector === "other") return "out";
    const isLarge  = size === "large"  || revenue === "large";
    const isMedium = !isLarge && (size === "medium" || revenue === "medium");
    if (sector === "annex1" && isLarge)           return "essential";
    if (sector === "annex1" && isMedium)          return "important";
    if (sector === "annex2" && (isLarge||isMedium)) return "important";
    return "check"; // small companies in scope sectors
  }

  // ── Today actions (client-side, shown on result screen immediately) ────────
  function buildTodayActions() {
    const missing   = state.missing;
    const sector    = state.answers.sector  || "annex2";
    const budget    = state.answers.budget  || "low";
    const ismsTool  = LINKS[ISMS_RECS[sector+":"+budget] || "reglyze"];
    const actions   = [];

    if (missing.includes("registration")) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · gratuit",
        title: "Înregistrați compania conform Legea nr. 362/2006 modificată",
        desc:  "Termen: conform transpunerii române NIS2. Formular de autoidentificare online. Aceasta este prioritatea dvs. #1.",
        cta:   "Instrucțiuni pas cu pas →",
        url:   "inregistrare-nis2.html",
        affiliate: false,
      });
    }

    if (missing.includes("isms")) {
      actions.push({
        step: actions.length + 1,
        time: "20 min · plan gratuit",
        title: "Lansați sistemul ISMS — " + ismsTool.name,
        desc:  "Planul gratuit acoperă evaluarea completă a lacunelor NIS2. După înregistrare: completați chestionarul integrat NIS2 — AI generează politicile automat.",
        cta:   "Începeți cu €0 → " + ismsTool.name,
        url:   ismsTool.url,
        affiliate: true,
        badge: "Recomandarea #1",
      });
    }

    if (missing.includes("insurance")) {
      actions.push({
        step: actions.length + 1,
        time: "20 min · deviz online",
        title: "Obțineți o ofertă de asigurare cyber",
        desc:  "Transferul riscului este un element al managementului riscului NIS2. Deviz Hiscox: 20 de minute online, fără convorbire cu un agent.",
        cta:   "Verificați oferta Hiscox →",
        url:   LINKS.hiscox.url,
        affiliate: true,
      });
    }

    if (missing.includes("training")) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · trial gratuit 14 zile",
        title: "Lansați cursuri de securitate cibernetică — KnowBe4",
        desc:  "Instruirea conducerii este o obligație legală (Art. 20 Legea nr. 362/2006 modificată). KnowBe4: platformă online, primul modul trimis echipei în 24 de ore.",
        cta:   "Începeți trial-ul gratuit →",
        url:   LINKS.knowbe4.url,
        affiliate: true,
      });
    }

    // Always suggest 1Password if no training (implies basics missing)
    if (missing.includes("isms") && actions.length < 5) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · trial gratuit 14 zile",
        title: "Implementați un manager de parole + MFA — 1Password",
        desc:  "Autentificarea multifactor (MFA) este impusă de Art. 21(j) Legea nr. 362/2006 modificată. 1Password Business: configurare în 30 de minute, implementare la echipă în aceeași zi.",
        cta:   "Începeți trial-ul gratuit →",
        url:   LINKS.onepassword.url,
        affiliate: true,
      });
    }

    return actions.slice(0, 4); // max 4 today actions
  }

  // ── GA4 helper ─────────────────────────────────────────────────────────────
  function track(event, params) {
    if (typeof gtag === "function") gtag("event", event, params || {});
  }

  // ── Render: question step ──────────────────────────────────────────────────
  function renderStep() {
    const q   = questions[state.step];
    const el  = document.getElementById("quiz-container");
    if (!el) return;

    const pct    = Math.round((state.step / TOTAL) * 100);
    const isLast = state.step === TOTAL - 1;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:${pct}%"></div>
        </div>
        <p class="text-sm text-gray" style="margin-bottom:.25rem;">Întrebarea ${state.step + 1} din ${TOTAL}</p>
        <h3>${q.title}</h3>
        <p style="color:var(--gray-500);font-size:.9rem;margin-bottom:1rem;">${q.hint}</p>
        <div class="quiz-options">
          ${q.options.map(opt => `
            <button class="quiz-option${state.answers[q.id] === opt.value ? " selected" : ""}"
                    data-value="${opt.value}" type="button">
              <span class="quiz-option__icon">${opt.icon}</span>
              <span>
                <span class="quiz-option__text">${opt.label}</span>
                <span class="quiz-option__sub">${opt.sub}</span>
              </span>
            </button>
          `).join("")}
        </div>
        <div class="quiz-nav">
          ${state.step > 0
            ? `<button class="btn btn--outline btn--sm" id="quiz-back">← Înapoi</button>`
            : `<span></span>`}
          <button class="btn btn--primary btn--sm" id="quiz-next"
                  ${state.answers[q.id] ? "" : "disabled"}>
            ${isLast ? "Calculează rezultatul meu →" : "Înainte →"}
          </button>
        </div>
      </div>`;

    el.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", () => {
        state.answers[q.id] = btn.dataset.value;
        el.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        el.querySelector("#quiz-next").removeAttribute("disabled");
        track("quiz_answer", { question: q.id, answer: btn.dataset.value });
        // Auto-advance on click for faster UX
        setTimeout(() => {
          if (isLast) { computeScore(); renderScoreGate(); }
          else { state.step++; renderStep(); }
        }, 280);
      });
    });

    el.querySelector("#quiz-back")?.addEventListener("click", () => {
      state.step--;
      renderStep();
    });

    el.querySelector("#quiz-next")?.addEventListener("click", () => {
      if (!state.answers[q.id]) return;
      if (isLast) { computeScore(); renderScoreGate(); }
      else { state.step++; renderStep(); }
    });
  }

  // ── Render: score + email gate ─────────────────────────────────────────────
  function renderScoreGate() {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing } = state;
    const pct    = Math.round((score / 10) * 100);
    const scope  = computeScope();

    const scoreColor = score <= 3 ? "#dc2626"
                     : score <= 6 ? "#d97706"
                     : "#16a34a";

    const scopeMsg = {
      essential: "Compania dvs. este o <strong>entitate esențială conform Legea nr. 362/2006 modificată</strong> — cel mai înalt nivel de cerințe.",
      important:  "Compania dvs. este o <strong>entitate importantă conform Legea nr. 362/2006 modificată</strong> — trebuie să îndepliniți cerințele NIS2.",
      check:      "Compania dvs. poate fi supusă Legea nr. 362/2006 modificată — verificați excepțiile pentru întreprinderile mici.",
      out:        "Compania dvs. probabil nu intră sub incidența Legea nr. 362/2006 modificată — este totuși recomandat să implementați măsurile de bază.",
    }[scope] || "";

    const gapText = missing.length === 0
      ? "Felicitări — aveți implementate toate măsurile esențiale!"
      : `Vă lipsesc <strong>${missing.length}</strong> măsuri esențiale de securitate. Puteți implementa majoritatea în 3 zile.`;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:100%"></div>
        </div>

        <div style="text-align:center;padding:1rem 0 .5rem;">
          <div style="font-size:.8rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;">
            Scorul dvs. de conformitate NIS2
          </div>
          <div style="font-size:3.5rem;font-weight:800;color:${scoreColor};line-height:1;">
            ${score}<span style="font-size:1.5rem;color:var(--gray-400);font-weight:500;">/10</span>
          </div>
          <div style="margin:.75rem auto;max-width:280px;height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;transition:width 1s;"></div>
          </div>
          <p style="font-size:.9rem;color:var(--gray-600);">${scopeMsg}</p>
          <p style="font-size:.92rem;">${gapText}</p>
        </div>

        <div style="background:#f0f7ff;border-radius:12px;padding:1.25rem;margin:1rem 0;">
          <p style="font-size:.95rem;font-weight:700;color:#1a1a2e;margin:0 0 .35rem;">
            📬 Primiți planul dvs. de acțiune pe 3 zile
          </p>
          <p style="font-size:.82rem;color:#555;margin:0 0 .75rem;">
            Planul dvs. personalizat: ce să faceți azi, mâine și săptămâna aceasta.
            Link-uri directe către instrumente + prompt AI pentru Claude / ChatGPT / Gemini.
          </p>
          <form id="score-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <input type="email" name="email" placeholder="adresa@email.ro" required
                   style="flex:1;min-width:180px;padding:.6rem .9rem;border:1px solid #d1d5db;border-radius:8px;font-size:.95rem;">
            <button type="submit" class="btn btn--primary">Trimite-mi planul →</button>
          </form>
          <p style="font-size:.75rem;color:#9ca3af;margin:.5rem 0 0;">Fără spam. Un singur e-mail cu planul + mementouri opționale.</p>
        </div>

        <button id="quiz-skip-email" type="button"
                style="background:none;border:none;color:var(--gray-400);font-size:.8rem;cursor:pointer;width:100%;text-align:center;padding:.25rem 0;">
          Afișează doar rezultatul, fără plan →
        </button>
      </div>`;

    track("quiz_score_shown", { score, missing: missing.join(","), scope });

    document.getElementById("score-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Se trimite...";
      state.email = email;
      _submitEmailAndReport(email, () => renderResult(true));
    });

    document.getElementById("quiz-skip-email")?.addEventListener("click", () => {
      track("quiz_email_skipped");
      renderResult(false);
    });
  }

  // ── Submit email to Beehiiv + trigger report ───────────────────────────────
  function _submitEmailAndReport(email, onDone) {
    const { score, missing, answers } = state;

    // Score tier tag
    const scoreTier = score <= 3 ? "score_low" : score <= 6 ? "score_mid" : "score_high";
    const tags = [scoreTier,
      "sector_" + (answers.sector || "unknown"),
      "role_"   + (answers.role   || "unknown"),
      ...(missing.includes("registration") ? ["missing_registration"] : []),
      ...(missing.includes("isms")         ? ["missing_isms"]         : []),
      ...(missing.includes("training")     ? ["missing_training"]     : []),
      ...(missing.includes("insurance")    ? ["missing_insurance"]    : []),
    ];

    // Call both endpoints in parallel
    const subscribeCall = fetch(SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "quiz_score_gate",
        tags,
        quiz_answers: {
          sector: answers.sector, size: answers.size, revenue: answers.revenue,
          budget: answers.budget, registered: answers.registered,
          has_isms: answers.has_isms, has_training: answers.has_training,
          has_insurance: answers.has_insurance, role: answers.role,
          score,
        },
      }),
    }).catch(() => {});

    const reportCall = fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector:        answers.sector,
        size:          answers.size,
        revenue:       answers.revenue,
        budget:        answers.budget,
        registered:    answers.registered,
        has_isms:      answers.has_isms,
        has_training:  answers.has_training,
        has_insurance: answers.has_insurance,
        role:          answers.role,
        score,
        missing,
        email,
        lang:   document.documentElement.lang || "pl",
        domain: window.location.hostname,
      }),
    }).catch(() => {});

    Promise.allSettled([subscribeCall, reportCall]).then(() => {
      track("quiz_completed", { score, sector: answers.sector, email_captured: true });
      if (onDone) onDone();
    });
  }

  // ── Render: result with today-actions ──────────────────────────────────────
  function renderResult(emailCaptured) {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing, answers } = state;
    const scope    = computeScope();
    const actions  = buildTodayActions();
    const pct      = Math.round((score / 10) * 100);
    const scoreColor = score <= 3 ? "#dc2626" : score <= 6 ? "#d97706" : "#16a34a";

    const scopeBadge = {
      essential: { text: "🚨 Entitate esențială",  color: "#fee2e2", tc: "#991b1b" },
      important:  { text: "⚠️ Entitate importantă", color: "#fefce8", tc: "#854d0e" },
      check:      { text: "🔍 Verificați excepțiile", color: "#fefce8", tc: "#854d0e" },
      out:        { text: "✅ Probabil în afara domeniului de aplicare", color: "#dcfce7", tc: "#166534" },
    }[scope] || { text: "NIS2", color: "#e5e7eb", tc: "#374151" };

    function actionCard(a) {
      const isAffiliate = a.affiliate;
      return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:1rem 1.1rem;margin-bottom:.75rem;${isAffiliate ? "border-left:3px solid var(--navy);" : ""}">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;">
            <span style="background:var(--navy);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;">${a.step}</span>
            <span style="font-size:.75rem;color:var(--gray-500);">${a.time}</span>
            ${isAffiliate && a.badge ? `<span style="background:#dcfce7;color:#166534;font-size:.68rem;font-weight:700;padding:.1rem .45rem;border-radius:4px;">${a.badge}</span>` : ""}
          </div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:.3rem;">${a.title}</div>
          <div style="font-size:.82rem;color:#555;margin-bottom:.6rem;">${a.desc}</div>
          <a href="${a.url}" ${isAffiliate ? 'target="_blank" rel="nofollow noopener"' : ''}
             style="display:inline-block;padding:.45rem .9rem;background:var(--navy);color:#fff;border-radius:6px;font-size:.82rem;font-weight:600;text-decoration:none;">
            ${a.cta}
          </a>
        </div>`;
    }

    const reskipBlock = missing.length === 0
      ? `<div style="background:#dcfce7;border-radius:10px;padding:1rem;text-align:center;margin-bottom:1rem;">
           <strong>🎉 Compania dvs. este în formă bună!</strong><br>
           <span style="font-size:.85rem;">Aveți implementate toate măsurile esențiale NIS2. Luați în considerare certificarea ISO 27001 ca dovadă a conformității.</span>
           <br><a href="certificare-iso-27001.html" style="font-size:.82rem;color:var(--navy);font-weight:700;">Aflați mai multe despre ISO 27001 →</a>
         </div>`
      : actions.map(actionCard).join("");

    el.innerHTML = `
      <div class="quiz-card">

        ${emailCaptured
          ? `<div style="background:#dcfce7;border-radius:8px;padding:.6rem 1rem;font-size:.82rem;color:#166534;font-weight:600;margin-bottom:1rem;text-align:center;">
               ✅ Planul a fost trimis la ${state.email || "adresa dvs. de e-mail"} — verificați căsuța poștală
             </div>`
          : ""}

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:2.5rem;font-weight:800;color:${scoreColor};line-height:1;">
              ${score}<span style="font-size:1rem;color:var(--gray-400);font-weight:500;">/10</span>
            </div>
            <div style="font-size:.7rem;color:var(--gray-500);">Scor NIS2</div>
          </div>
          <div style="flex:1;min-width:140px;">
            <div style="height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-bottom:.35rem;">
              <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;"></div>
            </div>
            <span style="display:inline-block;padding:.2rem .6rem;border-radius:12px;font-size:.75rem;font-weight:700;background:${scopeBadge.color};color:${scopeBadge.tc};">
              ${scopeBadge.text}
            </span>
          </div>
        </div>

        <h3 style="font-size:1.05rem;margin-bottom:.35rem;">
          ${missing.length > 0
            ? `🏃 Faceți AZI — total ~${Math.min(120, missing.length * 30)} minute`
            : "Statusul dvs. NIS2"}
        </h3>
        <p style="font-size:.82rem;color:var(--gray-500);margin-bottom:1rem;">
          ${missing.length > 0
            ? `${missing.length} pași lipsă. Cei de mai jos pot fi finalizați astăzi.`
            : "Toate măsurile esențiale sunt implementate."}
        </p>

        ${reskipBlock}

        ${missing.length > 0 ? `
          <div style="border-top:1px solid #e5e7eb;padding-top:1rem;margin-top:.5rem;">
            <p style="font-size:.78rem;color:var(--gray-500);margin-bottom:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">
              Pași următori (rezervați date)
            </p>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              <a href="testare-penetrare.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔍 Test de penetrare
              </a>
              <a href="certificare-iso-27001.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🏅 Certificare ISO 27001
              </a>
              <a href="securitatea-lantului-de-aprovizionare.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔗 Securitatea furnizorilor
              </a>
            </div>
          </div>` : ""}

        <div style="margin-top:1.25rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn--outline btn--sm" id="quiz-restart">← Începeți din nou</button>
          <a href="porownanie.html" class="btn btn--primary btn--sm">Comparați instrumentele NIS2 →</a>
        </div>

        ${!emailCaptured ? `
          <div style="margin-top:1rem;background:#f0f7ff;border-radius:8px;padding:.85rem;text-align:center;">
            <p style="font-size:.82rem;margin:0 0 .5rem;"><strong>Primiți planul complet pe e-mail</strong> cu prompt AI și link-uri către instrumente</p>
            <form id="late-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
              <input type="email" placeholder="adresa@email.ro" required
                     style="flex:1;min-width:160px;padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:6px;font-size:.85rem;">
              <button type="submit" class="btn btn--primary btn--sm">Trimite →</button>
            </form>
          </div>` : ""}
      </div>`;

    document.getElementById("quiz-restart")?.addEventListener("click", () => {
      state.step = 0; state.answers = {}; state.score = 0;
      state.missing = []; state.email = null;
      try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
      renderStep();
    });

    document.getElementById("late-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true; btn.textContent = "Se trimite...";
      state.email = email;
      _submitEmailAndReport(email, () => {
        e.target.parentElement.innerHTML =
          `<p style="font-size:.82rem;color:#166534;font-weight:700;">✅ Trimis la ${email}</p>`;
      });
    });

    track("quiz_result_shown", { score, scope, email_captured: emailCaptured });
  }

  // ── FAQ accordion ──────────────────────────────────────────────────────────
  function initFaq() {
    document.querySelectorAll(".faq-question").forEach(btn => {
      btn.addEventListener("click", () => {
        const item   = btn.closest(".faq-item");
        const isOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("quiz-container");
    if (container) renderStep();
    initFaq();
  });

})();