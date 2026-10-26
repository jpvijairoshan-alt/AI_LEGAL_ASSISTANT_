import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.main import app

SECRET = "test-secret-test-secret-test-secret"
client = TestClient(app)


def make_token(secret: str = SECRET) -> str:
    return jwt.encode({"lawyerId": "lawyer_1", "email": "a@b.co"}, secret, algorithm="HS256")


def auth(secret: str = SECRET) -> dict:
    return {"Authorization": f"Bearer {make_token(secret)}"}


def test_health_is_public():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "healthy"}


def test_chat_health_reports_vector_count():
    r = client.get("/api/chat/health")
    assert r.status_code == 200
    assert "vectors" in r.json() and "status" in r.json()


@pytest.mark.parametrize(
    "method,url,kwargs",
    [
        ("post", "/api/chat", {"json": {"question": "hi"}}),
        ("get", "/api/chat/sources?question=hi", {}),
        ("post", "/api/chat/reindex", {}),
    ],
)
def test_protected_routes_require_token(method, url, kwargs):
    assert getattr(client, method)(url, **kwargs).status_code == 401


def test_chat_rejects_token_signed_with_wrong_secret():
    r = client.post("/api/chat", json={"question": "hi"}, headers=auth("some-other-secret-value-xxxxxxxx"))
    assert r.status_code == 401


def test_chat_empty_question_is_400():
    r = client.post("/api/chat", json={"question": "   "}, headers=auth())
    assert r.status_code == 400
