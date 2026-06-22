import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def client():
    with patch("storage.db.DB_PATH", ":memory:"):
        from main import app
        with TestClient(app) as c:
            yield c


def test_list_personas_returns_defaults(client):
    response = client.get("/api/personas")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    ids = [p["id"] for p in data]
    assert "optimist" in ids
    assert "pessimist" in ids
    assert "contrarian" in ids
    assert "observer" in ids


def test_create_persona_201(client):
    response = client.post(
        "/api/personas",
        json={
            "name": "Devil's Advocate",
            "role": "Challenges all arguments regardless of position.",
            "system_prompt": "You are Devil's Advocate. Challenge every claim.",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Devil's Advocate"
    assert data["role"] == "Challenges all arguments regardless of position."
    assert data["is_default"] == 0
    assert data["enabled"] == 1


def test_update_default_persona(client):
    # PATCH endpoint seeds defaults before updating
    response = client.patch(
        "/api/personas/optimist",
        json={"name": "Super Optimist"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Super Optimist"


def test_update_nonexistent_persona_404(client):
    response = client.patch(
        "/api/personas/nonexistent-id",
        json={"name": "Ghost"},
    )
    assert response.status_code == 404


def test_delete_default_persona_400(client):
    # DELETE endpoint seeds defaults; optimist is a default, so 400
    response = client.delete("/api/personas/optimist")
    assert response.status_code == 400


def test_delete_observer_400(client):
    # Observer is explicitly protected even among defaults
    response = client.delete("/api/personas/observer")
    assert response.status_code == 400


def test_delete_nonexistent_persona_404(client):
    response = client.delete("/api/personas/nonexistent-id")
    assert response.status_code == 404


def test_restore_defaults(client):
    response = client.post("/api/personas/restore-defaults")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
