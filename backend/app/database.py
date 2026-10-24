from pathlib import Path
import sqlite3
import os

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = Path(os.getenv("BI_DB_PATH", DATA_DIR / "sales.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS sales (
    transaction_id TEXT PRIMARY KEY,
    order_date TEXT NOT NULL,
    month TEXT NOT NULL,
    product TEXT NOT NULL,
    category TEXT NOT NULL,
    region TEXT NOT NULL,
    sales_channel TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity >= 0),
    unit_price REAL NOT NULL CHECK(unit_price >= 0),
    discount_amount REAL NOT NULL CHECK(discount_amount >= 0),
    status TEXT NOT NULL,
    revenue REAL NOT NULL
);
"""

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def initialize():
    with connect() as conn:
        conn.executescript(SCHEMA)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_month ON sales(month)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_region ON sales(region)")
