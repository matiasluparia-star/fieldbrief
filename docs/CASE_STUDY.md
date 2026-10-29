# FieldBrief — service request coordination

**Type:** Independent portfolio demonstration. **Customer:** Fictional small service company. **Status:** Working prototype. No previous clients or measured business outcomes are claimed.

## Problem

Small service teams often receive incomplete requests by text. Before visiting, they need to clarify symptoms, assess urgency, organise possible materials and explain the next step to the customer. Quotes also need a clear structure without pretending the cause is known.

## Solution

FieldBrief creates a structured service brief from free text, supports a local reference image, and calculates a transparent editable estimate. An optional browser language model creates an alternative assessment and reply without an API key. The operator reviews all content before use.

## Demonstration

1. Select **Pool filter**, then **Create job brief**.
2. Review the suggested filter/valve issues and inspection questions.
3. Set 2 labour hours at 45, materials 60, call-out 25 and tax 21%. The estimate totals 211.75 in the selected currency.
4. Edit and copy the customer reply; download JSON for a future integration.
5. Expand free on-device AI and download the model. Review its alternative assessment; choose the customer reply only after checking it.
6. Try **Electrical fault** to see the urgent safety path.

## Product choices

Static hosting and local computation avoid paid backend accounts. Rule-based urgency stays separate from experimental model output. Reference images are explicitly not diagnosed. Quote figures are operator-controlled, not invented market prices. The interface works as a usable service desk, not a static mockup.

## What this demonstrates

Interface design, input validation, structured exports, domain workflow modelling, calculation logic, error handling, browser model integration and software documentation. It does not demonstrate past paid client work or deployed n8n/Make/WhatsApp integrations.

## Sensible first client extension

One branded request form, one agreed output schema, one destination (email draft or spreadsheet), explicit human approval, sample-based acceptance tests and a short setup guide. Agree expected volumes and provider costs before adding a hosted AI API.
