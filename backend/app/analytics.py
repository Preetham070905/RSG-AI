
from .database import connect


def completed_filter():
    return "LOWER(status) = 'completed'"


def format_currency(value):
    """Format values as Indian rupees without unnecessary decimal places."""
    return f"₹{value:,.0f}"


def dashboard():
    with connect() as conn:
        kpi = conn.execute(f"""
            SELECT
                COALESCE(SUM(revenue), 0) AS total_revenue,
                COUNT(*) AS transaction_count,
                COALESCE(SUM(quantity), 0) AS units_sold,
                COALESCE(AVG(revenue), 0) AS avg_order_value
            FROM sales
            WHERE {completed_filter()} AND quantity > 0
        """).fetchone()

        monthly = conn.execute(f"""
            SELECT month, ROUND(SUM(revenue), 2) AS revenue
            FROM sales
            WHERE {completed_filter()} AND quantity > 0
            GROUP BY month
            ORDER BY month
        """).fetchall()

        products = conn.execute(f"""
            SELECT product, ROUND(SUM(revenue), 2) AS revenue
            FROM sales
            WHERE {completed_filter()} AND quantity > 0
            GROUP BY product
            ORDER BY revenue DESC
        """).fetchall()

        regions = conn.execute(f"""
            SELECT region, ROUND(SUM(revenue), 2) AS revenue
            FROM sales
            WHERE {completed_filter()} AND quantity > 0
            GROUP BY region
            ORDER BY revenue DESC
        """).fetchall()

    return {
        "kpis": {
            key: round(float(kpi[key] or 0), 2)
            for key in kpi.keys()
        },
        "monthly": [dict(row) for row in monthly],
        "products": [dict(row) for row in products],
        "regions": [dict(row) for row in regions],
        "metric_definition": (
            "Completed transactions with quantity > 0; "
            "revenue = quantity × unit price − discount."
        ),
    }


def answer_intent(intent, params=None):
    params = params or {}

    with connect() as conn:

        if intent == "total_revenue":
            row = conn.execute(f"""
                SELECT
                    ROUND(COALESCE(SUM(revenue), 0), 2) AS value,
                    COUNT(*) AS rows
                FROM sales
                WHERE {completed_filter()} AND quantity > 0
            """).fetchone()

            value = float(row["value"] or 0)

            return {
                "answer": (
                    f"Total completed-sales revenue is "
                    f"{format_currency(value)}."
                ),
                "value": value,
                "evidence": [
                    {
                        "metric": "Completed transactions included",
                        "value": row["rows"],
                    }
                ],
            }

        if intent == "top_category":
            rows = conn.execute(f"""
                SELECT
                    category AS label,
                    ROUND(SUM(revenue), 2) AS value,
                    SUM(quantity) AS units
                FROM sales
                WHERE {completed_filter()} AND quantity > 0
                GROUP BY category
                ORDER BY value DESC
            """).fetchall()

            if not rows:
                return {
                    "answer": "No eligible sales records were found.",
                    "value": None,
                    "evidence": [],
                }

            top = rows[0]

            return {
                "answer": (
                    f"{top['label']} is the best-performing category "
                    f"by revenue, generating "
                    f"{format_currency(top['value'])}."
                ),
                "value": top["value"],
                "evidence": [dict(row) for row in rows],
            }

        if intent == "top_product":
            rows = conn.execute(f"""
                SELECT
                    product AS label,
                    ROUND(SUM(revenue), 2) AS value,
                    SUM(quantity) AS units
                FROM sales
                WHERE {completed_filter()} AND quantity > 0
                GROUP BY product
                ORDER BY value DESC
                LIMIT 5
            """).fetchall()

            if not rows:
                return {
                    "answer": "No eligible sales records were found.",
                    "value": None,
                    "evidence": [],
                }

            top = rows[0]

            return {
                "answer": (
                    f"{top['label']} generated the highest revenue: "
                    f"{format_currency(top['value'])}."
                ),
                "value": top["value"],
                "evidence": [dict(row) for row in rows],
            }

        if intent == "monthly_trend":
            rows = conn.execute(f"""
                SELECT
                    month AS label,
                    ROUND(SUM(revenue), 2) AS value
                FROM sales
                WHERE {completed_filter()} AND quantity > 0
                GROUP BY month
                ORDER BY month
            """).fetchall()

            if not rows:
                return {
                    "answer": "No eligible monthly sales records were found.",
                    "value": None,
                    "evidence": [],
                    "chart": "line",
                }

            highest_month = max(rows, key=lambda row: row["value"])

            return {
                "answer": (
                    "Here is the monthly completed-sales revenue trend. "
                    f"The highest revenue was in {highest_month['label']}, "
                    f"at {format_currency(highest_month['value'])}."
                ),
                "value": None,
                "evidence": [dict(row) for row in rows],
                "chart": "line",
            }

        if intent == "top_region":
            rows = conn.execute(f"""
                SELECT
                    region AS label,
                    ROUND(SUM(revenue), 2) AS value
                FROM sales
                WHERE {completed_filter()} AND quantity > 0
                GROUP BY region
                ORDER BY value DESC
            """).fetchall()

            if not rows:
                return {
                    "answer": "No eligible sales records were found.",
                    "value": None,
                    "evidence": [],
                }

            top = rows[0]

            return {
                "answer": (
                    f"{top['label']} generated the highest regional sales: "
                    f"{format_currency(top['value'])}."
                ),
                "value": top["value"],
                "evidence": [dict(row) for row in rows],
            }

        if intent == "month_comparison":
            month_a = params.get("month_a")
            month_b = params.get("month_b")

            if not month_a or not month_b:
                return {
                    "answer": (
                        "Please specify two months, for example: "
                        "Compare January 2026 and February 2026."
                    ),
                    "value": None,
                    "evidence": [],
                    "needs_clarification": True,
                }

            def month_value(month):
                row = conn.execute(f"""
                    SELECT ROUND(COALESCE(SUM(revenue), 0), 2)
                    FROM sales
                    WHERE {completed_filter()}
                      AND quantity > 0
                      AND month = ?
                """, (month,)).fetchone()

                return float(row[0] or 0)

            a = month_value(month_a)
            b = month_value(month_b)

            delta = round(b - a, 2)
            percentage = round((delta / a) * 100, 2) if a else None

            if delta > 0:
                direction = "increased"
            elif delta < 0:
                direction = "decreased"
            else:
                direction = "did not change"

            answer = (
                f"Revenue {direction} by {format_currency(abs(delta))} "
                f"from {month_a} to {month_b}."
            )

            if percentage is not None:
                answer += f" ({percentage:+.2f}%)."
            else:
                answer += (
                    " Percentage change is undefined because "
                    "the starting month had zero revenue."
                )

            return {
                "answer": answer,
                "value": delta,
                "evidence": [
                    {"month": month_a, "revenue": a},
                    {"month": month_b, "revenue": b},
                    {
                        "change": delta,
                        "percentage_change": percentage,
                    },
                ],
            }

    return {
        "answer": (
            "I can help you analyze your sales data, but I don't currently support general questions." 
            "Try asking about total revenue, top-performing products or categories, regional sales, or monthly trends."
        ),
        "value": None,
        "evidence": [],
        "unsupported": True,
    }
