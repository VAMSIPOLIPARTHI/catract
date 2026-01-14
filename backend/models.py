import os
import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision.models import resnet50, efficientnet_b0
from huggingface_hub import hf_hub_download
from typing import List, Dict

# Device Configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- Preprocessing Functions (Matching Training) ---
def apply_clahe(image):
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)

def ben_preprocessing(image, sigmaX=10):
    image = cv2.addWeighted(image, 4, cv2.GaussianBlur(image, (0, 0), sigmaX), -4, 128)
    return image

FINAL_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# --- Model Architecture ---
class HybridCataractModel(nn.Module):
    def __init__(self, num_classes=2):
        super().__init__()
        # Load backbones (weights=None because we load custom weights later)
        self.resnet = resnet50(weights=None)
        self.effnet = efficientnet_b0(weights=None)

        # Fusion Classifier: 2048 (ResNet) + 1280 (EffNet) = 3328
        self.classifier = nn.Sequential(
            nn.Linear(3328, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        # Manual Feature Extraction to bypass mismatched FC layers in backbones
        r = self.resnet.conv1(x)
        r = self.resnet.bn1(r)
        r = self.resnet.relu(r)
        r = self.resnet.maxpool(r)
        r = self.resnet.layer1(r)
        r = self.resnet.layer2(r)
        r = self.resnet.layer3(r)
        r = self.resnet.layer4(r)
        r = self.resnet.avgpool(r)
        r = torch.flatten(r, 1)

        e = self.effnet.features(x)
        e = self.effnet.avgpool(e)
        e = torch.flatten(e, 1)

        combined = torch.cat((r, e), dim=1)
        return self.classifier(combined)

# --- Wrapper for app.py ---
class TorchWrapper:
    def __init__(self, model: nn.Module, name: str):
        self.model = model.to(DEVICE).eval()
        self.name = name
        self.labels = ["Normal", "Cataract"]

    def predict(self, pil_image: Image.Image) -> Dict:
        img_rgb = np.array(pil_image.convert("RGB"))
        img = ben_preprocessing(img_rgb)
        img = apply_clahe(img)
        
        img_pil = Image.fromarray(img)
        x = FINAL_TRANSFORM(img_pil).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            logits = self.model(x)
            probs = torch.softmax(logits, dim=1)[0]

        idx = int(torch.argmax(probs))
        return {
            "best_label": self.labels[idx],
            "best_confidence": float(probs[idx])
        }

def build_hybrid_hf() -> TorchWrapper:
    print("Downloading/Loading hybrid model from Hugging Face...")
    model_path = hf_hub_download(repo_id="vamsi1103/catract", filename="hybridensemblemodel_clahe.pth")
    
    model = HybridCataractModel(num_classes=2)
    state = torch.load(model_path, map_location=DEVICE)

    if isinstance(state, dict):
        state = state.get("model_state_dict", state.get("state_dict", state))
    
    model.load_state_dict(state, strict=False)
    return TorchWrapper(model, name="Hybrid_ResNet50_EffNetB0")

def load_models() -> List[TorchWrapper]:
    return [build_hybrid_hf()]

def run_ensemble(models: List[TorchWrapper], image: Image.Image) -> Dict:
    return models[0].predict(image)