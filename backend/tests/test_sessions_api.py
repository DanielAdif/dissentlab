import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def client():
    with patch("storage.db.DB_PATH", ":memory:"):
        from main import app
        with TestClient(app) as c:
            yield c


def test_create_session(client):
    response = client.post("/api/sessions", json={
        "question": "Should I build a startup?",
        "intensity": "standard",
        "model_provider": "openai",
        "model_name": "gpt-4o-mini",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["question"] == "Should I build a startup?"
    assert data["status"] == "pending"


def test_list_sessions_empty(client):
    response = client.get("/api/sessions")
    assert response.status_code == 200
    assert response.json() == []
