# Quick Start Guide — From Zero to Working IDS

> **Context**: You have a fresh machine. The project repo is on GitHub. You've already placed CIC-IDS2017 PCAPs in `data/pcaps/` and CSVs in `data/csv/`. This guide walks you through everything else.

---

## Step 0 — Clone the Repo

```bash
git clone https://github.com/Ch1Hub/2CSCys.git
cd 2CSCys
```

---

## Step 1 — Install Zeek

Ubuntu/Debian:
```bash
sudo apt update && sudo apt install zeek
```

macOS:
```bash
brew install zeek
```

Verify:
```bash
zeek --version
```

If `zeek` isn't in PATH after install (common on Ubuntu):
```bash
export PATH=$PATH:/opt/zeek/bin
# Or add to ~/.bashrc
echo 'export PATH=$PATH:/opt/zeek/bin' >> ~/.bashrc
```

---

## Step 2 — Set Up Python Environment

```bash
bash setup.sh
```

This does:
- Creates `venv/` with Python 3 virtual environment
- Installs all pip dependencies (lightgbm, catboost, shap, scikit-learn, etc.)
- Creates required directories (`data/pcaps/`, `data/csv/`, `data/processed/`, `models/`, `logs/`, `output/`)
- Checks Zeek is installed

Or manually:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
mkdir -p data/pcaps data/csv data/processed models logs output
```

---

## Step 3 — Place Your Data

You said you've already done this, but just to confirm:

```
2CSCys/
├── data/
│   ├── pcaps/          ← CIC-IDS2017 .pcap files go here
│   │   ├── Monday-WorkingHours.pcap
│   │   ├── Tuesday-WorkingHours.pcap
│   │   ├── Wednesday-workingHours.pcap
│   │   ├── Thursday-WorkingHours-Morning.pcap
│   │   ├── Thursday-WorkingHours-Afternoon.pcap
│   │   ├── Friday-WorkingHours-Morning.pcap
│   │   ├── Friday-WorkingHours-Afternoon-PortScan.pcap
│   │   └── Friday-WorkingHours-Afternoon-DDoS.pcap
│   └── csv/            ← CIC-IDS2017 .csv label files go here
│       ├── Monday-WorkingHours.pcap_ISCX.csv
│       ├── Tuesday-WorkingHours.pcap_ISCX.csv
│       └── ...
```

**Important**: The CSVs are used ONLY for ground-truth labels (matching by IP). The PCAPs go through Zeek for actual feature extraction. Do NOT train on the CSV feature columns — they come from CICFlowMeter, not Zeek, and would cause a training-inference mismatch.

Quick check:
```bash
ls data/pcaps/*.pcap   # Should list your PCAP files
ls data/csv/*.csv      # Should list your CSV files
```

---

## Step 4 — Generate the Dataset

This is the big one. It processes every PCAP through Zeek, extracts features, and matches labels.

```bash
source venv/bin/activate
python generate_dataset.py --pcap-dir data/pcaps --csv-dir data/csv --output-dir data/processed
```

**What this does (expect it to take a while — PCAPs are large):**

1. For each PCAP in `data/pcaps/`:
   - Runs `zeek -r <pcap> zeek/extract_features.zeek`
   - Parses the resulting logs (conn.log, dns.log, http.log, ssl.log)
   - Extracts features using the same `feature_extractor.py` used at inference time
2. Loads CIC-IDS2017 CSVs for ground-truth labels only
3. Matches Zeek flows to labels by source/destination IP
4. Creates train/test splits for Tier-1 and Tier-2
5. Saves everything to `data/processed/`

**Output files created:**
```
data/processed/
├── feature_order.joblib      # Feature column names (order matters!)
├── tier1_X_train.csv        # Tier-1 training features
├── tier1_X_test.csv
├── tier1_y_train.csv        # Tier-1 binary labels (0=Benign, 1=Anomaly)
├── tier1_y_test.csv
├── tier2_X_train.csv        # Tier-2 training features (anomalies only)
├── tier2_X_test.csv
├── tier2_y_train.csv        # Tier-2 multi-class labels (DoS/BruteForce/PortScan)
├── tier2_y_test.csv
├── zeroday_X.csv            # Zero-day evaluation features
├── zeroday_y.csv            # Zero-day labels (DDoS/Botnet/WebAttack)
├── all_features_labeled.csv  # Full labeled dataset
└── zeek_logs/               # Raw Zeek output per PCAP
```

**Troubleshooting:**
- If Zeek fails on a PCAP, check `zeek --version` — need Zeek 4.0+
- If a PCAP is corrupted, the script will skip it and continue
- Check `logs/` for Zeek stderr
- If you get "No CSV files found", verify `data/csv/` has `.csv` files
- If all labels come out as "Benign", the IP matching between Zeek and CSV may have failed — check that the CSVs have `Source IP` / `Destination IP` columns

**Alternative**: Use the Jupyter notebook instead:
```bash
jupyter notebook notebooks/01_dataset_preparation.ipynb
```

---

## Step 5 — Train Tier-1 (LightGBM + IsolationForest)

```bash
jupyter notebook notebooks/02_tier1_training.ipynb
```

Run all cells. This notebook:

1. Loads `data/processed/tier1_*` files
2. Standardizes features with `StandardScaler`
3. Computes class weights (benign vs anomaly imbalance)
4. Trains **LightGBM** binary classifier (Benign=0, Anomaly=1)
5. Trains **IsolationForest** as secondary anomaly detector
6. Evaluates combined decision logic:
   ```
   Anomaly if (LGBM_prob > 0.30 OR IsoForest flags anomaly)
   ```
7. Auto-tunes the LGBM threshold if recall < 95%
8. Generates SHAP feature importance plot
9. Saves to `models/`:
   - `tier1_lgbm.joblib`
   - `tier1_iforest.joblib`
   - `tier1_preprocessor.joblib` (StandardScaler)
   - `tier1_feature_order.joblib`
   - `tier1_thresholds.joblib`
   - `tier1_shap_explainer.joblib`

**What to check:**
- Combined recall should be **≥ 95%** — this is the spec requirement
- If it's below 95%, the notebook auto-tunes the threshold
- Confusion matrix and classification report are printed

---

## Step 6 — Train Tier-2 (CatBoost)

```bash
jupyter notebook notebooks/03_tier2_training.ipynb
```

Run all cells. This notebook:

1. Loads `data/processed/tier2_*` files (anomaly samples only)
2. Encodes labels: DoS=0, BruteForce=1, PortScan=2
3. Standardizes features with `StandardScaler`
4. Trains **CatBoost** with class weights
5. Evaluates per-class Precision/Recall/F1
6. Tests unknown detection threshold (0.65):
   - Known attacks should have confidence > 0.65
   - Zero-day attacks (DDoS, Botnet, WebAttack) should have confidence < 0.65
7. Runs **end-to-end pipeline test** on zero-day data:
   - DDoS → Tier-1: Anomaly → Tier-2: Unknown ✓
8. Generates SHAP feature importance plot
9. Saves to `models/`:
   - `tier2_catboost.joblib`
   - `tier2_preprocessor.joblib`
   - `tier2_label_encoder.joblib`
   - `tier2_feature_order.joblib`
   - `tier2_thresholds.joblib`
   - `tier2_shap_explainer.joblib`

**What to check:**
- Per-class F1 should be > 0.90 for known attacks
- Zero-day detection: most DDoS/Botnet/WebAttack should be classified as "Unknown"
- The end-to-end test section shows the full pipeline working

---

## Step 7 — Run Inference

### Offline PCAP Mode

Process a PCAP file through the full pipeline:

```bash
source venv/bin/activate
python -m src.main --mode offline --pcap /path/to/suspicious.pcap
```

### Live Traffic Mode

Monitor a network interface in real-time:

```bash
source venv/bin/activate
python -m src.main --mode live --interface eth0

# With time limit:
python -m src.main --mode live --interface eth0 --duration 300
```

Press Ctrl+C to stop live capture.

### Output

Alerts are saved to `output/` as JSON files. Example:

```json
{
    "status": "malicious",
    "attack": "PortScan",
    "confidence": 0.91,
    "source": "pcap",
    "window_id": 42,
    "explanation": {
        "top_features": [
            {"feature": "unique_dst_ports", "importance": 0.34, "direction": "positive"}
        ]
    },
    "timestamp": "2026-05-21T10:30:00.000Z"
}
```

---

## Quick Reference

| Command | What it does |
|---|---|
| `bash setup.sh` | Setup venv + dependencies |
| `python generate_dataset.py` | Process PCAPs → training data |
| `jupyter notebook notebooks/01_*.ipynb` | Dataset prep (alternative to CLI) |
| `jupyter notebook notebooks/02_*.ipynb` | Train Tier-1 |
| `jupyter notebook notebooks/03_*.ipynb` | Train Tier-2 |
| `python -m src.main --mode offline --pcap X` | Run on PCAP |
| `python -m src.main --mode live --interface eth0` | Run on live traffic |

---

## File Locations After Everything is Done

```
2CSCys/
├── config/config.json               ← All thresholds and settings (auto-updated after training)
├── zeek/extract_features.zeek       ← Zeek script
├── src/                             ← All Python modules
├── notebooks/                       ← Training notebooks
├── data/
│   ├── pcaps/                       ← Your PCAP files
│   ├── csv/                         ← Your CSV label files
│   └── processed/                   ← Generated after step 4
│       ├── feature_order.joblib
│       ├── tier1_X_train.csv
│       ├── tier1_X_test.csv
│       ├── tier1_y_train.csv
│       ├── tier1_y_test.csv
│       ├── tier2_X_train.csv
│       ├── tier2_X_test.csv
│       ├── tier2_y_train.csv
│       ├── tier2_y_test.csv
│       ├── zeroday_X.csv
│       ├── zeroday_y.csv
│       └── zeek_logs/
├── models/                          ← Generated after steps 5-6
│   ├── tier1_lgbm.joblib
│   ├── tier1_iforest.joblib
│   ├── tier1_preprocessor.joblib
│   ├── tier1_feature_order.joblib
│   ├── tier1_thresholds.joblib
│   ├── tier1_shap_explainer.joblib
│   ├── tier2_catboost.joblib
│   ├── tier2_preprocessor.joblib
│   ├── tier2_label_encoder.joblib
│   ├── tier2_feature_order.joblib
│   ├── tier2_thresholds.joblib
│   └── tier2_shap_explainer.joblib
├── logs/                            ← Zeek logs + alert logs
├── output/                          ← Alert JSON output files
├── generate_dataset.py              ← CLI dataset generation script
├── requirements.txt
└── setup.sh
```

---

## Common Issues

| Problem | Fix |
|---|---|
| `zeek: command not found` | Install Zeek, add to PATH: `export PATH=$PATH:/opt/zeek/bin` |
| `ModuleNotFoundError: No module named 'src'` | Run from project root, or `pip install -e .` |
| `No PCAP files found` | Place `.pcap` files in `data/pcaps/` |
| `No CSV files found` | Place `.csv` files in `data/csv/` |
| Low Tier-1 recall (<95%) | Notebook 02 auto-tunes the threshold. Check output. |
| Zero-day not detected as Unknown | Threshold may need adjustment. Edit `config/config.json` → `tier2.unknown_threshold` |
| Zeek crashes on large PCAP | Normal. Zeek handles this — the script skips failed PCAPs. |
| Feature mismatch at inference | You must train on Zeek-extracted features, not CICFlowMeter CSV columns. |

---

## Architecture Summary

```
Traffic → Zeek → Feature Extraction → Tier-1 (Anomaly?) → Tier-2 (Which attack?) → Unknown? → Alert
                  (same features       LightGBM +            CatBoost           confidence < 0.65
                   at train time       IsolationForest                          = unknown
                   and inference)
```

**Key principle**: Features come from Zeek at both training and inference time. The CIC-IDS2017 CSVs provide ground-truth labels only — never features.