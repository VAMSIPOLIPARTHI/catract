# =========================================================================
# BACKEND FILE (app.py) - FINAL MEDICAL GRADE VERSION
# =========================================================================

import os
import uuid
from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from PIL import Image
from dotenv import load_dotenv
from supabase import create_client, Client

# Project imports
from models import load_models, run_ensemble
from utils import extract_eye_regions, make_pdf_report

# -------------------------------------------------------------------------
# ENV & APP INIT
# -------------------------------------------------------------------------
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://catract.vercel.app",
            "http://localhost:3000",
            "http://localhost:5173"
        ]
    }
})

# -------------------------------------------------------------------------
# LOAD AI MODELS
# -------------------------------------------------------------------------
print("Loading AI Models...")
MODELS = load_models()
print(f"Models Loaded: {[m.name for m in MODELS]}")

# -------------------------------------------------------------------------
# SUPABASE CONFIG
# -------------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL or SUPABASE_KEY missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("Supabase client initialized")

# -------------------------------------------------------------------------
# MEDICAL CONSTANTS
# -------------------------------------------------------------------------
CONFIDENCE_THRESHOLD = 0.85   # medical screening standard

# -------------------------------------------------------------------------
# API: ANALYZE IMAGE
# -------------------------------------------------------------------------
@app.route("/api/analyze", methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    try:
        original_img = Image.open(request.files["image"]).convert("RGB")
    except Exception as e:
        return jsonify({"error": "Invalid image", "detail": str(e)}), 400

    report_id = str(uuid.uuid4())

    # --------------------------------------------------
    # 1️⃣ EYE EXTRACTION (NO MODEL HERE)
    # --------------------------------------------------
    extracted_eyes = extract_eye_regions(original_img)

    results = []

    # --------------------------------------------------
    # 2️⃣ MODEL INFERENCE + MEDICAL DECISION
    # --------------------------------------------------
    for eye in extracted_eyes:
        prediction = run_ensemble(MODELS, eye["image"])

        raw_label = prediction["best_label"].lower()
        confidence = float(prediction["best_confidence"])

        # -------- MEDICAL DECISION LOGIC --------
        if confidence < CONFIDENCE_THRESHOLD:
            final_label = "Inconclusive"
        elif raw_label == "cataract":
            final_label = "Cataract"
        else:
            final_label = "Healthy"

        results.append({
            "side": eye["side"],
            "label": final_label,
            "confidence": confidence,
            "image": eye["image"]  # used ONLY for PDF
        })

    # --------------------------------------------------
    # 3️⃣ GENERATE PDF REPORT
    # --------------------------------------------------
    pdf_buffer = make_pdf_report(original_img, results)
    pdf_filename = f"{report_id}.pdf"

    supabase.storage.from_("reports-pdf").upload(
        pdf_filename,
        pdf_buffer.read(),
        file_options={
            "content-type": "application/pdf",
            "upsert": "true"
        }
    )

    pdf_url = supabase.storage.from_("reports-pdf").get_public_url(pdf_filename)

    # --------------------------------------------------
    # 4️⃣ RESPONSE (NO IMAGES RETURNED)
    # --------------------------------------------------
    return jsonify({
        "report_id": report_id,
        "results": [
            {
                "side": r["side"],
                "label": r["label"],
                "confidence": r["confidence"]
            } for r in results
        ],
        "download_url": pdf_url
    }), 200


# -------------------------------------------------------------------------
# API: DOWNLOAD REPORT
# -------------------------------------------------------------------------
@app.route("/report/<report_id>", methods=["GET"])
def download_report(report_id):
    return redirect(
        f"{SUPABASE_URL}/storage/v1/object/public/reports-pdf/{report_id}.pdf",
        code=302
    )


# -------------------------------------------------------------------------
# API: HEALTH CHECK
# -------------------------------------------------------------------------
@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"ok": True})


# -------------------------------------------------------------------------
# RUN LOCAL
# -------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
