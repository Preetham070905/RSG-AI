
from contextlib import asynccontextmanager
from pathlib import Path
import os
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .analytics import dashboard, answer_intent
from .interpret import interpret
from .ingest import load_csv
from .database import connect

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
@asynccontextmanager
async def lifespan(app: FastAPI):
    db_path = Path(
        os.getenv(
            "BI_DB_PATH",
            Path(__file__).resolve().parents[2] / "data" / "sales.db"
        )
    )

    if not db_path.exists():
        load_csv()

    yield


app = FastAPI(
    title="Mini AI Business Intelligence Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:5173"
    ).split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)


@app.get("/api/health")
def health():
    with connect() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM sales"
        ).fetchone()[0]

    return {"status": "ok", "rows_loaded": count}


@app.get("/api/dashboard")
def get_dashboard():
    return dashboard()


@app.post("/api/ask")
def ask(req: QuestionRequest):
    question = req.question.strip()

    if len(question) < 3:
        raise HTTPException(
            status_code=422,
            detail="Please enter a meaningful question."
        )

    intent, params, method = interpret(question)
    result = answer_intent(intent, params)

    result.update({
        "question": question,
        "intent": intent,
        "interpretation_method": method,
        "metric_definition": (
            "Completed transactions with quantity > 0; "
            "revenue = quantity × unit price − discount."
        ),
    })

    return result
