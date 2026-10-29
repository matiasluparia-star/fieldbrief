# Validation — 29 October 2026

## Automated

`npm test`: 9 passing tests. Covers all nine demonstration categories, complete brief sections, electrical escalation, a negated hazard example, unknown-category fallback, request limits, explicit trade overrides, quote totals, invalid amounts, actual model Markdown normalisation and rejection of incomplete model structures. JavaScript modules pass Node syntax checks.

## Observed in Chrome cloud browser

- Pool example -> complete job brief, routine assessment and an editable reply.
- Initial quote: 2 h × 45 + materials 60 + call-out 25 = subtotal 175; 21% tax = 36.75; total 211.75 EUR.
- Changed to 3 h and USD: total 266.20 USD.
- Copy reply: clipboard contained the generated customer reply.
- JSON export: downloaded and programmatically verified trade, reply, total 266.20 and USD currency.
- Real on-device Qwen2.5-0.5B model downloaded and generated a multi-section pool assessment. It took several minutes and used Markdown rather than the requested JSON. A regression test covers normalising the observed Markdown headings.
- Model quality is limited: its raw output suggested unconfirmed materials and terms. Its results are clearly marked for review and cannot replace the original safety warning or deterministic quote.
- Initial interface visually reviewed and screenshot recorded.

## Limits of verification

Photo selection was started but interrupted; do not claim end-to-end photo testing. Browser print/save-as-PDF and mobile Safari were not verified. Responsive CSS is implemented but no physical iPhone test was performed. Model inference is not a diagnostic or safety guarantee. The final parser is covered by a test using the observed output format; a second full inference is not yet recorded here.

## Recovery and expansion
Recovered original source on 29 October 2026. Existing GitHub repository was empty and existing Site had zero saved versions. Preserved Site identity. Added software, automation, design and business templates plus a general fallback. Verified software brief in Chrome after expansion. Reduced cancellable AI timeout to three minutes. Mobile Safari and a new model inference remain unverified.
