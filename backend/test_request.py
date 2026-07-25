"""Prueba rapida del flujo completo. Uso: python test_request.py [ruta_foto]"""
import sys
import uuid

import requests

BASE = "http://127.0.0.1:8000"
photo_path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\LENOVO\Downloads\terremoto.jpg"

with open(photo_path, "rb") as f:
    response = requests.post(
        f"{BASE}/incidents",
        files=[("photos", (photo_path, f, "image/jpeg"))],
        data={
            "description": "casa derrumbada por el sismo, hay escombros",
            "lat": -12.05,
            "lon": -77.03,
            "client_id": str(uuid.uuid4()),
            "created_at_client": "2026-07-25T10:00:00Z",
        },
        timeout=120,
    )

print("POST /incidents ->", response.status_code)
print(response.text)

if response.status_code < 300:
    incident_id = response.json()["incident_id"]
    detail = requests.get(f"{BASE}/incidents/{incident_id}", timeout=60).json()
    print()
    print("status:", detail.get("status"))
    print("gemma_result:", detail.get("gemma_result"))
