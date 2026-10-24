# Architecture

```text
React + Recharts
   | POST /api/ask
   v
FastAPI + Pydantic request validation
   |
   v
Intent interpreter (deterministic patterns; optional Gemini classifier)
   | allowlisted intent only
   v
Fixed analytics functions / parameterized SQLite queries
   |
   v
Structured JSON: answer + evidence + metric definition
```

The language model does not generate executable SQL. Query execution is selected by a small allowlist of known analytics functions. User text is never interpolated into SQL. Month values are bound as SQL parameters.
