
"""Interpret sales questions using deterministic rules and optional Gemini classification."""

import json
import os
import re

SUPPORTED = {
    "total_revenue",
    "top_product",
    "monthly_trend",
    "top_region",
    "month_comparison",
    "top_category",
}


def _month_from_text(text):
    months = {
        "january": "01",
        "february": "02",
        "march": "03",
        "april": "04",
        "may": "05",
        "june": "06",
        "july": "07",
        "august": "08",
        "september": "09",
        "october": "10",
        "november": "11",
        "december": "12",
    }

    found = []
    for name, number in months.items():
        pattern = rf"\b{name}\s*(?:[,/-]?\s*(20\d{{2}}))?\b"
        for match in re.finditer(pattern, text.lower()):
            year = match.group(1) or "2026"
            found.append((match.start(), f"{year}-{number}"))

    found.sort()
    return [month for _, month in found]


def deterministic_intent(question):
    q = question.lower().strip()

    if any(
        term in q
        for term in ["compare", "change between", "difference between", "versus", " vs"]
    ):
        months = _month_from_text(q)
        return "month_comparison", {
            "month_a": months[0] if len(months) > 0 else None,
            "month_b": months[1] if len(months) > 1 else None,
        }

    if any(
        term in q
        for term in [
            "monthly trend",
            "month by month",
            "revenue trend",
            "trend over time",
        ]
    ):
        return "monthly_trend", {}

    if any(
        term in q
        for term in [
            "which region",
            "top region",
            "highest sales region",
            "region generated",
        ]
    ):
        return "top_region", {}
    if any(
        term in q
        for term in [
            "which category",
            "top category",
            "best performing category",
            "strongest performing category",
            "highest revenue category",
            "sales category",
        ]
    ):
        return "top_category", {}
    if any(
        term in q
        for term in [
            "which product",
            "top product",
            "highest revenue product",
            "product generated",
        ]
    ):
        return "top_product", {}

    if any(
        term in q
        for term in [
            "total revenue",
            "revenue overall",
            "overall revenue",
            "total sales",
        ]
    ):
        return "total_revenue", {}

    return None, {}


def interpret(question):
    intent, params = deterministic_intent(question)
    if intent:
        return intent, params, "deterministic"

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return "unsupported", {}, "fallback"

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

        response = client.models.generate_content(
            model=model,
            contents=(
                "Classify this question about sales analytics. "
                "Choose exactly one allowed intent. "
                "Allowed intents: total_revenue, top_product, "
                "monthly_trend, top_region, month_comparison, unsupported. "
                "For month_comparison, provide month_a and month_b as YYYY-MM "
                "or null. Default the year to 2026 when omitted. "
                "Never generate SQL. Question: " + question
            ),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "intent": {
                            "type": "STRING",
                            "enum": [
                                "total_revenue",
                                "top_product",
                                "monthly_trend",
                                "top_region",
                                "month_comparison",
                                "unsupported",
                            ],
                        },
                        "month_a": {"type": "STRING", "nullable": True},
                        "month_b": {"type": "STRING", "nullable": True},
                    },
                    "required": ["intent", "month_a", "month_b"],
                },
            ),
        )

        if not response.text:
            return "unsupported", {}, "fallback"

        data = json.loads(response.text)
        intent = data.get("intent")

        if intent not in SUPPORTED:
            return "unsupported", {}, "fallback"

        params = {}
        for key in ("month_a", "month_b"):
            month = data.get(key)
            if month is None:
                params[key] = None
            elif isinstance(month, str) and re.fullmatch(
                r"20\d{2}-(0[1-9]|1[0-2])", month
            ):
                params[key] = month
            else:
                return "unsupported", {}, "fallback"

        return intent, params, "gemini"

    except Exception as exc:
        print(f"Gemini classification failed: {type(exc).__name__}: {exc}")
        return "unsupported", {}, "fallback"
