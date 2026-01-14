# =========================================================================
# utils.py – FINAL MEDICAL VERSION
# =========================================================================

import io
import uuid
import cv2
import numpy as np
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import datetime

# =========================================================================
# 1️⃣ EYE EXTRACTION (MODEL-FREE, MEDICAL SAFE)
# =========================================================================
def extract_eye_regions(pil_img: Image.Image):
    """
    Robust eye extraction using OpenCV only.

    Supports:
    - Full face images (2 eyes)
    - Both-eye close-ups
    - Single-eye macro images

    Returns:
    [
        { "side": "Right Eye" | "Left Eye" | "Detected Eye",
          "image": PIL.Image }
    ]
    """

    img_rgb = np.array(pil_img)
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    H, W = gray.shape

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    eye_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_eye.xml"
    )

    results = []

    # --------------------------------------------------
    # 1️⃣ FACE DETECTION (PRIMARY – BEST QUALITY)
    # --------------------------------------------------
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(120, 120)
    )

    if len(faces) > 0:
        # Use largest detected face
        faces = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
        fx, fy, fw, fh = faces[0]

        # Eyes are located in upper 45% of face
        roi_y2 = fy + int(fh * 0.45)
        roi_gray = gray[fy:roi_y2, fx:fx + fw]

        eyes = eye_cascade.detectMultiScale(
            roi_gray,
            scaleFactor=1.05,
            minNeighbors=5,
            minSize=(30, 30)
        )

        # ---------- CASE A: 2 VALID EYES FOUND ----------
        if len(eyes) >= 2:
            eyes = sorted(eyes, key=lambda e: e[0])[:2]

            for i, (ex, ey, ew, eh) in enumerate(eyes):
                pad_x = int(ew * 0.25)
                pad_y = int(eh * 0.25)

                x1 = max(fx + ex - pad_x, 0)
                y1 = max(fy + ey - pad_y, 0)
                x2 = min(fx + ex + ew + pad_x, W)
                y2 = min(fy + ey + eh + pad_y, H)

                crop = pil_img.crop((x1, y1, x2, y2))
                side = "Right Eye" if i == 0 else "Left Eye"

                results.append({
                    "side": side,
                    "image": crop
                })

            return results

        # ---------- CASE B: FACE FOUND BUT EYES NOT RELIABLE ----------
        # SAFELY split upper face into two halves
        mid_x = fx + fw // 2

        results.append({
            "side": "Right Eye",
            "image": pil_img.crop((fx, fy, mid_x, roi_y2))
        })
        results.append({
            "side": "Left Eye",
            "image": pil_img.crop((mid_x, fy, fx + fw, roi_y2))
        })

        return results

    # --------------------------------------------------
    # 2️⃣ NO FACE → SINGLE EYE IMAGE
    # --------------------------------------------------
    eyes = eye_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=3,
        minSize=(40, 40)
    )

    if len(eyes) > 0:
        # Use largest detected eye
        ex, ey, ew, eh = max(eyes, key=lambda e: e[2] * e[3])
        pad = int(ew * 0.3)

        x1 = max(ex - pad, 0)
        y1 = max(ey - pad, 0)
        x2 = min(ex + ew + pad, W)
        y2 = min(ey + eh + pad, H)

        crop = pil_img.crop((x1, y1, x2, y2))

        return [{
            "side": "Detected Eye",
            "image": crop
        }]

    # --------------------------------------------------
    # 3️⃣ FINAL FALLBACK (GUARANTEED OUTPUT)
    # --------------------------------------------------
    return [{
        "side": "Detected Eye",
        "image": pil_img
    }]


# =========================================================================
# 2️⃣ MEDICAL PDF REPORT
# =========================================================================
def make_pdf_report(original_img: Image.Image, results: list) -> io.BytesIO:
    """
    Generates a professional medical-style PDF report.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    PRIMARY = (0.05, 0.5, 0.9)
    DARK = (0.12, 0.15, 0.2)

    # Header
    c.setFillColorRGB(*PRIMARY)
    c.rect(0, height - 100, width, 100, fill=True)

    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(40, height - 60, "CataractDetect AI")
    c.setFont("Helvetica", 12)
    c.drawString(40, height - 80, "Automated Ophthalmic Screening Report")

    rid = str(uuid.uuid4())[:8].upper()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(width - 40, height - 60, f"REF: #{rid}")
    c.drawRightString(width - 40, height - 80, f"Date: {now}")

    y = height - 140

    # Input Image
    c.setFillColorRGB(*DARK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "1. Analyzed Input")
    y -= 20

    ow, oh = original_img.size
    scale = min(250 / ow, 180 / oh)
    c.drawImage(ImageReader(original_img), 40, y - oh * scale, ow * scale, oh * scale)
    y -= oh * scale + 40

    # Findings
    c.drawString(40, y, "2. Detailed Findings")
    y -= 30

    for r in results:
        if y < 150:
            c.showPage()
            y = height - 100

        crop = r["image"]
        cw, ch = crop.size
        scale = min(100 / cw, 100 / ch)

        c.roundRect(40, y - 120, width - 80, 120, 10, fill=False)
        c.drawImage(ImageReader(crop), 50, y - 110, cw * scale, ch * scale)

        c.setFont("Helvetica-Bold", 10)
        c.drawString(170, y - 25, r["side"].upper())

        c.setFont("Helvetica-Bold", 18)
        c.drawString(170, y - 50, r["label"])

        c.setFont("Helvetica", 10)
        c.drawString(170, y - 75, f"Confidence: {r['confidence']:.1%}")

        y -= 140

    # Footer
    c.setFont("Helvetica", 8)
    c.drawCentredString(
        width / 2,
        40,
        "Disclaimer: AI screening tool only. Not a medical diagnosis."
    )

    c.save()
    buffer.seek(0)
    return buffer
