import os
import pytest
from fastapi.testclient import TestClient

from app.database import initialize, connect
from app.main import app


@pytest.fixture(scope="module", autouse=True)
def seed_db():
    with TestClient(app) as client:
        initialize()
        with connect() as conn:
            conn.execute("DELETE FROM sales")
            rows = [
                ("T1","2026-01-05","2026-01","Mouse","Accessories","North","Retail",2,10,0,"Completed",20),
                ("T2","2026-02-05","2026-02","Chair","Furniture","South","Online",1,100,10,"Completed",90),
                ("T3","2026-02-08","2026-02","Monitor","Electronics","West","Retail",1,50,0,"Returned",50),
                ("T4","2026-02-09","2026-02","Zero item","Accessories","North","Retail",0,5,0,"Completed",0),
            ]
            conn.executemany(
                "INSERT INTO sales VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                rows
            )

        yield


def test_health():
    with TestClient(app) as c:
        assert c.get("/api/health").json()["rows_loaded"] == 4

def test_total_revenue():
    with TestClient(app) as c:
        r = c.post("/api/ask", json={"question":"What is the total revenue?"})
        assert r.status_code == 200
        assert r.json()["value"] == 110

def test_top_product():
    with TestClient(app) as c:
        r = c.post("/api/ask", json={"question":"Which product generated the highest revenue?"})
        assert r.json()["evidence"][0]["label"] == "Chair"

def test_monthly_trend():
    with TestClient(app) as c:
        r = c.post("/api/ask", json={"question":"Show the monthly revenue trend"})
        assert len(r.json()["evidence"]) == 2

def test_month_comparison():
    with TestClient(app) as c:
        r = c.post("/api/ask", json={"question":"Compare January 2026 and February 2026"})
        assert r.json()["value"] == 70

def test_unsupported_question():
    with TestClient(app) as c:
        r = c.post("/api/ask", json={"question":"What is the weather today?"})
        assert r.status_code == 200
        assert r.json()["unsupported"] is True

def test_invalid_short_question():
    with TestClient(app) as c:
        r = c.post("/api/ask", json={"question":"?"})
        assert r.status_code == 422
