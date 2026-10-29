# FieldBrief · Nexotopo portfolio
### From customer request to a service job brief.

A working portfolio prototype for service businesses across sectors: software development, automation, design, business administration, maintenance and physical trades. It converts incoming requests into an organised assessment, questions, a quote structure and an editable customer reply.

**This is an independent demonstration project, not a commissioned client project. All example requests are fictional.**

## Try it

- Hosted workspace: https://fieldbrief-service-assistant.validraven5.chatgpt.site (public demo after publication)
- Source: https://github.com/matiasluparia-star/fieldbrief
- Launch locally: `python3 -m http.server 8080 --directory dist`, then open http://localhost:8080
- Run tests: `npm test` (Node.js 20+, no npm dependencies required)

## What works

- Free-text request capture, automatic or explicit service category.
- Nine fictional examples spanning software, automation, design, administration and physical trades.
- Immediate, rule-based job summary, provisional causes, urgency, materials, questions, next steps and customer reply.
- Real optional on-device language model: Qwen2.5-0.5B-Instruct with Transformers.js / ONNX Runtime in a Web Worker. Generates an alternative full assessment and reply, validated before a reply can be selected.
- Editable estimate: labour, materials, call-out fee, tax and EUR/USD/GBP display. All defaults are illustrative, not market rates or AI price predictions.
- Local JPG/PNG/WebP reference photo preview, maximum 5 MB. Photos are not analysed or exported.
- Editable/copyable reply, structured JSON download, browser print/save as PDF.
- Responsive interface, accessible labels, keyboard focus and readable empty/error states.

## Architecture

Buildless HTML, CSS and JavaScript ES modules. No database, paid API, account registration, secret, server-side AI proxy or banking card is required. `engine.mjs` provides deterministic triage and quote calculations; `app.mjs` manages the interface; `ai-worker.mjs` loads the real model outside the UI thread.

The user must click to download AI dependencies from jsDelivr and Hugging Face (roughly 400 MB plus runtime assets; device and browser support vary). Request text is processed on-device, not sent to an AI inference API. Model files may be cached by the browser. Font resources load from Google Fonts. Network providers can see normal connection metadata; this is not a claim of zero network activity.

Triage is deliberately labelled **rule-based**, not passed off as AI. AI output is an alternative assessment that requires review. Malformed structured output remains visible as raw text and never silently replaces the original brief. AI cannot lower the deterministic urgency warning. Numbers use a deterministic calculator rather than model arithmetic.

## Business case (fictional)

A pool contractor receives a vague message about low circulation and dirty water returning after a backwash. FieldBrief prepares inspection questions, possible valve/filter issues, a parts checklist and a non-binding estimate layout. The operator reviews the assessment, adjusts rates and copies a customer reply. The prototype demonstrates intake, decision support, document generation and optional local inference. No productivity or revenue improvement has been measured.

## Repository

```text
dist/                 Deployable application (any static host)
  index.html          Assistant workspace
  portfolio.html      Business case and technical overview
  engine.mjs          Triage and quote logic
  ai-worker.mjs       Optional real browser AI
  app.mjs             Accessible UI interactions
  style.css           Responsive design
  assets/             Demonstration screenshots
 tests/               Node test runner checks
 docs/                Case study, portfolio text and validation notes
```

## Scope and limitations

English-first. Triage has a small English/Spanish keyword vocabulary, not a multilingual language understanding system. Rules can misclassify unusual or negated hazards; urgent situations always need human judgement. No medical, legal or engineering certification is implied. AI is experimental, can hallucinate, and is not a competent tradesperson. Mobile Safari has not been certified and may reject model loading because of memory limits. No image diagnosis, CRM connection, WhatsApp sending, persistent job history, accounts or background scheduling is included. These are potential separately scoped extensions, not existing features.

Estimates are non-binding. Confirm scope, safety, parts, permits and applicable taxes before sending. The browser print dialog controls actual PDF output. Never use the demo as an emergency response service.

## Cost

Core app and tests: no dependencies, no paid API. Local AI: no inference subscription, but uses bandwidth, memory and device compute. Hosting availability and free tiers depend on the chosen provider. No paid services were purchased for this prototype.

## Validation

See [validation notes](docs/VALIDATION.md). Run `npm test` for reproducible automated checks. These are focused regression tests, not proof of safety or production readiness.

## Portfolio and adaptation

See [business case](docs/CASE_STUDY.md) and [marketplace profile text](docs/PORTFOLIO_COPY.md). Possible small fixed-scope adaptations include branded intake forms, approved reply generation, JSON/CSV exports and one defined API integration. External API and hosting costs should be quoted separately and accounts remain client-owned.

## License

MIT for project code. External libraries and model retain their respective licences; see [third-party notices](docs/THIRD_PARTY.md).

## Cross-sector support
Four added templates cover software, automation, design and business administration. Other sectors use a general scoping workflow, with optional experimental local AI. This is not universal specialist expertise. Physical materials become resources in digital engagements.

## Nexotopo commercial service preview

Spanish landing page: https://fieldbrief-service-assistant.validraven5.chatgpt.site/servicios.html

A cross-sector service offer with a fictional interactive intake/follow-up demonstration. The enquiry form prepares a local draft and opens the visitor’s mail app or Outlook web, addressed to nexotopo@outlook.com. The visitor must review and send it; the website does not claim delivery or store enquiries. See [Studio notes](docs/STUDIO.md) for scope, validation and launch requirements. The commercial demo includes software and document workflows and safe CSV export for Excel. `npm test` runs fifteen checks. Nexotopo is a provisional brand; no Gmail address or trademark registration is claimed.
