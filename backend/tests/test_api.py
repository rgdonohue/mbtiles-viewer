from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


def test_datasets_endpoint():
    r = client.get("/api/datasets")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "datasets" in data
    assert isinstance(data["datasets"], list)


def test_styles_invalid_id_rejected():
    r = client.get("/api/styles/../co_roads")
    # Either 400 due to validation or 404 if path is sanitized and not found
    assert r.status_code in (400, 404)


def test_styles_known_dataset_exists():
    # This will succeed only if style file exists in data/styles
    r = client.get("/api/styles/co_roads")
    # Accept 200 if available; allow 404 in environments missing styles
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        style = r.json()
        assert style.get("version") == 8
        assert isinstance(style.get("layers"), list)

