from pathlib import Path
import pandas as pd
from .database import connect, initialize, ROOT

CSV_PATH = ROOT / "data" / "ai_bi_assistant_sales_data.csv"
REQUIRED = ["Transaction_Id", "Order_date", "Product", "Category", "Region",
            "Sales_channel", "Quantity", "Unit_price", "Discount_amount", "Status"]

def load_csv(path=CSV_PATH):
    """Import valid rows; quarantine invalid rows in a report rather than guessing missing values."""
    df = pd.read_csv(path)
    missing_columns = [c for c in REQUIRED if c not in df.columns]
    if missing_columns:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing_columns)}")

    df = df[REQUIRED].copy()
    for c in ["Transaction_Id", "Product", "Category", "Region", "Sales_channel", "Status"]:
        df[c] = df[c].astype("string").str.strip()

    df["Order_date"] = pd.to_datetime(df["Order_date"], format="%d-%m-%Y", errors="coerce")
    for c in ["Quantity", "Unit_price", "Discount_amount"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    invalid = (
        df[["Transaction_Id", "Product", "Category", "Region", "Sales_channel", "Status"]].isna().any(axis=1)
        | df[["Transaction_Id", "Product", "Category", "Region", "Sales_channel", "Status"]].apply(
            lambda col: col.astype("string").str.len().eq(0)).any(axis=1)
        | df["Order_date"].isna()
        | df["Quantity"].isna() | df["Unit_price"].isna() | df["Discount_amount"].isna()
        | (df["Quantity"] < 0) | (df["Unit_price"] < 0) | (df["Discount_amount"] < 0)
        | (df["Discount_amount"] > df["Quantity"] * df["Unit_price"])
    )
    invalid_rows = df.loc[invalid].copy()
    valid = df.loc[~invalid].copy()
    valid["Quantity"] = valid["Quantity"].astype(int)
    valid["order_date"] = valid["Order_date"].dt.strftime("%Y-%m-%d")
    valid["month"] = valid["Order_date"].dt.strftime("%Y-%m")
    valid["revenue"] = (valid["Quantity"] * valid["Unit_price"] - valid["Discount_amount"]).round(2)

    initialize()
    with connect() as conn:
        conn.execute("DELETE FROM sales")
        rows = [
            (r.Transaction_Id, r.order_date, r.month, r.Product, r.Category, r.Region,
             r.Sales_channel, int(r.Quantity), float(r.Unit_price), float(r.Discount_amount),
             r.Status, float(r.revenue))
            for r in valid.itertuples(index=False)
        ]
        conn.executemany("""INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", rows)

    report = {
        "source_rows": int(len(df)),
        "loaded_rows": int(len(valid)),
        "quarantined_rows": int(len(invalid_rows)),
        "quarantined_transaction_ids": invalid_rows["Transaction_Id"].astype(str).tolist(),
        "notes": [
            "Rows with missing or invalid required values are excluded instead of silently imputed.",
            "Revenue is quantity × unit price − discount amount.",
            "Returned transactions are retained in the database but excluded from completed-sales analytics."
        ]
    }
    (ROOT / "data" / "ingestion_report.json").write_text(__import__("json").dumps(report, indent=2))
    return report

if __name__ == "__main__":
    print(load_csv())
