# Ledgerlens - Invoice & Expense Anomaly Detector (DATA722, Phase 1 Use Case B)
Advisory only. No write-back. Synthetic data only (CFS is a fictional entity).
Deploy: `npm i -g vercel && vercel --prod` from this folder. Optional AI explanations: add env var ANTHROPIC_API_KEY (and optionally MODEL) in the Vercel project settings, then redeploy. Without it the app still works and shows template explanations.
Files: index.html (UI), engine.js (detection + evaluation), api/explain.js (LLM explanation), generate_data.py (seeded synthetic data with labels), sample_invoices.csv.
