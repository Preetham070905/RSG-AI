
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Activity,
  ArrowUpRight,
  Database,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Package,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Rows3,
  ArrowLeft,
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const suggestions = [
  'What is the total revenue?',
  'Which product generated the highest revenue?',
  'Which sales category has the strongest performance?',
  'What is the monthly revenue trend?',
  'Which region generated the highest sales?',
  'Compare January 2026 and February 2026',
];

function App() {
  const [activePage, setActivePage] = useState('overview');

  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    setRefreshing(true);
    setError('');

    try {
      const [dashboardResponse, healthResponse] = await Promise.all([
        fetch(`${API}/api/dashboard`),
        fetch(`${API}/api/health`),
      ]);

      if (!dashboardResponse.ok) {
        throw new Error('Could not load the sales dashboard.');
      }

      const dashboardData = await dashboardResponse.json();
      setData(dashboardData);

      if (healthResponse.ok) {
        setHealth(await healthResponse.json());
      } else {
        setHealth(null);
      }
    } catch (err) {
      setError(
        'Backend unavailable. Start FastAPI on port 8000, then refresh the page.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function ask(q = question) {
    if (!q.trim() || asking) return;

    setQuestion(q);
    setAsking(true);
    setError('');
    setAnswer(null);

    try {
      const response = await fetch(`${API}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: q.trim() }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.detail || 'The question could not be processed.');
      }

      setAnswer(body);
    } catch (err) {
      setError(
        err.message ||
          'Could not connect to the AI Assistant. Please try again.'
      );
    } finally {
      setAsking(false);
    }
  }

  function navigate(page) {
    setActivePage(page);
    setError('');
  }

  const k = data?.kpis;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={21} />
          </div>
          <div>
            <b>northstar</b>
            <small>SALES INTELLIGENCE</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <button
          type="button"
          className={`nav-item ${activePage === 'overview' ? 'active' : ''}`}
          onClick={() => navigate('overview')}
        >
          <Activity size={17} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activePage === 'assistant' ? 'active' : ''}`}
          onClick={() => navigate('assistant')}
        >
          <MessageSquareText size={17} />
          <span>AI Assistant</span>
          <span className="new-pill">AI</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activePage === 'quality' ? 'active' : ''}`}
          onClick={() => navigate('quality')}
        >
          <Database size={17} />
          <span>Data quality</span>
        </button>

        <div className="sidebar-bottom">
          <div className="secure-icon">
            <ShieldCheck size={18} />
          </div>
          <b>Grounded analytics</b>
          <p>
            Every answer is calculated from the sales database—not guessed by
            the model.
          </p>
          <div className="connection">
            <span />
            {health?.status === 'ok'
              ? 'Local database connected'
              : loading
                ? 'Checking connection...'
                : 'Connection unavailable'}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{' '}
            {activePage === 'overview'
              ? 'Overview'
              : activePage === 'assistant'
                ? 'AI Assistant'
                : 'Data quality'}
          </div>

          <div className="top-right">
            <span className="live-dot" />
            DATASET · JAN—JUN 2026
            <div className="avatar">BI</div>
          </div>
        </header>

        <div className="content">
          {error && <div className="error">{error}</div>}

          {activePage === 'overview' && (
            <OverviewPage
              data={data}
              loading={loading}
              refreshing={refreshing}
              onRefresh={load}
              onAsk={(q) => {
                setActivePage('assistant');
                ask(q);
              }}
            />
          )}

          {activePage === 'assistant' && (
            <AssistantPage
              question={question}
              setQuestion={setQuestion}
              answer={answer}
              asking={asking}
              onAsk={ask}
              onBack={() => navigate('overview')}
            />
          )}

          {activePage === 'quality' && (
            <DataQualityPage
              health={health}
              data={data}
              loading={loading}
              onRefresh={load}
              onBack={() => navigate('overview')}
            />
          )}

          <footer>
            <span>
              Northstar Intelligence <i>·</i> RSG development challenge
            </span>
            <span>
              Metric: quantity × unit price − discount <i>·</i> Returned orders
              excluded
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <section className="welcome">
      <div>
        <div className="eyebrow">
          <Sparkles size={14} /> {eyebrow}
        </div>
        <h1>
          {title}<span>.</span>
        </h1>
        <p>{description}</p>
      </div>
      {action}
    </section>
  );
}

function Kpi({ icon, label, value, note, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        <div className={`kpi-icon ${color}`}>{React.cloneElement(icon, { size: 18 })}</div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-note">{note}</div>
    </div>
  );
}

function OverviewPage({ data, loading, refreshing, onRefresh, onAsk }) {
  return (
    <>
      <PageHeading
        eyebrow="YOUR BUSINESS, IN FOCUS"
        title="Sales overview"
        description="A clear view of performance, powered by your transaction data."
        action={
          <button className="refresh" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} />
            {refreshing ? 'Refreshing...' : 'Refresh data'}
          </button>
        }
      />

      <section className="kpis">
        <Kpi
          icon={<TrendingUp />}
          label="Total revenue"
          value={loading ? '—' : money(data?.kpis?.total_revenue)}
          note="Completed sales, after discounts"
          color="violet"
        />
        <Kpi
          icon={<Database />}
          label="Transactions"
          value={
            loading
              ? '—'
              : Number(data?.kpis?.transaction_count || 0).toLocaleString('en-IN')
          }
          note="Completed, non-zero quantity"
          color="blue"
        />
        <Kpi
          icon={<Package />}
          label="Units sold"
          value={
            loading
              ? '—'
              : Number(data?.kpis?.units_sold || 0).toLocaleString('en-IN')
          }
          note="Across eligible transactions"
          color="green"
        />
        <Kpi
          icon={<ArrowUpRight />}
          label="Average order value"
          value={loading ? '—' : money(data?.kpis?.avg_order_value)}
          note="Average revenue per transaction"
          color="orange"
        />
      </section>

      <section className="grid-main">
        <div className="panel chart-panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Revenue over time</div>
              <div className="panel-sub">Monthly completed-sales revenue</div>
            </div>
            <span className="chart-tag">2026</span>
          </div>

          <div className="chart-wrap">
            {data?.monthly?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.monthly}
                  margin={{ top: 15, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8172f5" stopOpacity={0.27} />
                      <stop offset="100%" stopColor="#8172f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#202b3e"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) =>
                      new Date(`${v}-02`).toLocaleString('en-US', {
                        month: 'short',
                      })
                    }
                    stroke="#7e8ba2"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    stroke="#7e8ba2"
                    tickLine={false}
                    axisLine={false}
                    width={42}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111b2c',
                      border: '1px solid #29364b',
                      borderRadius: 10,
                    }}
                    formatter={(v) => money(v)}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#9385ff"
                    strokeWidth={2.5}
                    fill="url(#fill)"
                    activeDot={{ r: 5, fill: '#b6adff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">
                Revenue trend appears when the backend is connected.
              </div>
            )}
          </div>

          <div className="chart-foot">
            <span>
              <i className="legend-dot" /> Monthly revenue
            </span>
            <span>Source: SQLite sales table</span>
          </div>
        </div>

        <div className="panel assistant-panel">
          <div className="assistant-heading">
            <div className="ai-symbol">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="panel-title">Ask your data</div>
              <div className="panel-sub">AI business intelligence assistant</div>
            </div>
            <span className="online">READY</span>
          </div>

          <p className="assistant-intro">
            Ask a business question in plain English. Answers are backed by
            database queries and supporting figures.
          </p>

          <div className="suggestions">
            {suggestions.slice(0, 4).map((s) => (
              <button key={s} onClick={() => onAsk(s)}>
                {s}
              </button>
            ))}
          </div>

          <button className="refresh" onClick={() => onAsk(suggestions[0])}>
            <MessageSquareText size={15} /> Open AI Assistant
          </button>
        </div>
      </section>

      <section className="grid-bottom">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Product performance</div>
              <div className="panel-sub">Revenue by product</div>
            </div>
            <Package size={17} className="muted" />
          </div>

          <div className="bar-chart">
            {data?.products?.length ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={data.products.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 4, right: 15, left: 5, bottom: 0 }}
                >
                  <CartesianGrid stroke="#202b3e" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="product"
                    width={100}
                    stroke="#9caac0"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111b2c',
                      border: '1px solid #29364b',
                      borderRadius: 10,
                    }}
                    formatter={(v) => money(v)}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#6f67e8"
                    radius={[0, 5, 5, 0]}
                    barSize={17}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">No product data yet.</div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Regional sales</div>
              <div className="panel-sub">Ranked by completed-sales revenue</div>
            </div>
            <MapPin size={17} className="muted" />
          </div>

          <div className="region-list">
            {data?.regions?.map((r, i) => (
              <div className="region-row" key={r.region}>
                <div className="rank">{String(i + 1).padStart(2, '0')}</div>
                <div className="region-name">{r.region}</div>
                <div className="region-track">
                  <div
                    style={{
                      width: `${
                        data.regions[0]?.revenue
                          ? (100 * r.revenue) / data.regions[0].revenue
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <b>{money(r.revenue)}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function AssistantPage({
  question,
  setQuestion,
  answer,
  asking,
  onAsk,
  onBack,
}) {
  return (
    <>
      <PageHeading
        eyebrow="SALES INTELLIGENCE"
        title="AI Assistant"
        description="Ask questions about your sales data and get database-backed answers."
        action={
          <button className="refresh" onClick={onBack}>
            <ArrowLeft size={15} /> Back to overview
          </button>
        }
      />

      <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
        <div className="assistant-heading">
          <div className="ai-symbol">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="panel-title">Ask your data</div>
            <div className="panel-sub">
              Supported analysis: revenue, products, categories, regions, and
              monthly comparisons.
            </div>
          </div>
          <span className="online">READY</span>
        </div>

        <form
          className="ask-form"
          style={{ marginTop: 24 }}
          onSubmit={(e) => {
            e.preventDefault();
            onAsk();
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="For example: Which product generated the highest revenue?"
            maxLength={500}
          />
          <button aria-label="Ask question" disabled={asking || !question.trim()}>
            <Send size={17} />
          </button>
        </form>

        <div style={{ marginTop: 24 }}>
          <div className="panel-title">Suggested questions</div>
          <div
            className="suggestions"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              marginTop: 12,
            }}
          >
            {suggestions.map((s) => (
              <button key={s} onClick={() => onAsk(s)} disabled={asking}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {asking && (
          <div className="answer-box" style={{ marginTop: 20 }}>
            <span className="spinner" /> Analyzing your question...
          </div>
        )}

        {answer && !asking && (
          <AnswerBox answer={answer} />
        )}

        {!answer && !asking && (
          <div className="empty" style={{ padding: 32 }}>
            <MessageSquareText size={28} />
            <p>Your answer and supporting sales figures will appear here.</p>
          </div>
        )}
      </section>
    </>
  );
}

function AnswerBox({ answer }) {
  const evidence = answer.evidence || [];

  function evidenceLabel(item) {
    return (
      item.label ||
      item.month ||
      item.category ||
      item.product ||
      item.region ||
      item.metric ||
      'Supporting figure'
    );
  }

  function evidenceValue(item) {
    if (item.value !== undefined) return money(item.value);
    if (item.revenue !== undefined) return money(item.revenue);
    if (item.percentage_change !== undefined) {
      return `${item.percentage_change ?? 'N/A'}%`;
    }
    if (item.change !== undefined) return money(item.change);
    if (item.units !== undefined) return item.units;
    if (item.rows !== undefined) return item.rows;
    return '—';
  }

  return (
    <div className="answer-box" style={{ marginTop: 20 }}>
      <div className="answer-label">
        <Sparkles size={13} /> ANSWER ·{' '}
        {(answer.intent || 'sales analysis').replaceAll('_', ' ')}
      </div>
      <p>{answer.answer}</p>

      {evidence.length > 0 && (
        <div className="evidence">
          {evidence.map((item, index) => (
            <div key={`${evidenceLabel(item)}-${index}`}>
              <span>{evidenceLabel(item)}</span>
              <b>{evidenceValue(item)}</b>
            </div>
          ))}
        </div>
      )}

      <small className="grounding">
        Calculated from completed transactions · SQLite
      </small>
    </div>
  );
}

function DataQualityPage({ health, data, loading, onRefresh, onBack }) {
  const loadedRows = health?.rows_loaded;
  const metricDefinition =
    data?.metric_definition ||
    'Completed transactions with quantity greater than zero. Revenue is quantity multiplied by unit price minus discount.';

  const checks = [
    {
      title: 'Backend connectivity',
      description: 'The health endpoint reports the backend status.',
      passed: health?.status === 'ok',
      status:
        health?.status === 'ok'
          ? 'Connected'
          : loading
            ? 'Checking'
            : 'Unavailable',
      icon: <Activity size={18} />,
    },
    {
      title: 'Database records',
      description: 'Number of rows reported by the backend health endpoint.',
      passed: typeof loadedRows === 'number',
      status:
        typeof loadedRows === 'number'
          ? `${loadedRows} rows loaded`
          : loading
            ? 'Checking'
            : 'Unavailable',
      icon: <Rows3 size={18} />,
    },
    {
      title: 'Revenue calculation',
      description: 'Revenue follows the documented quantity, price, and discount formula.',
      passed: Boolean(data?.metric_definition),
      status: data?.metric_definition ? 'Definition available' : 'Not reported',
      icon: <FileCheck2 size={18} />,
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow="DATA VALIDATION"
        title="Data quality"
        description="Review the available ingestion status and the rules used for sales analytics."
        action={
          <button className="refresh" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={15} />
            {loading ? 'Checking...' : 'Refresh checks'}
          </button>
        }
      />

      <section className="kpis">
        <Kpi
          icon={<Database />}
          label="Database status"
          value={loading ? '—' : health?.status === 'ok' ? 'Healthy' : 'Unknown'}
          note="Reported by the health endpoint"
          color="green"
        />
        <Kpi
          icon={<Rows3 />}
          label="Rows loaded"
          value={
            loading
              ? '—'
              : typeof loadedRows === 'number'
                ? loadedRows.toLocaleString('en-IN')
                : 'N/A'
          }
          note="Records reported by the backend"
          color="blue"
        />
        <Kpi
          icon={<ShieldCheck />}
          label="Validation checks"
          value={checks.filter((check) => check.passed).length}
          note="Checks supported by available API data"
          color="violet"
        />
        <Kpi
          icon={<AlertTriangle />}
          label="Quarantined rows"
          value={
            typeof health?.quarantined_rows === 'number'
              ? health.quarantined_rows
              : 'N/A'
          }
          note={
            typeof health?.quarantined_rows === 'number'
              ? 'Reported by backend'
              : 'Not exposed by the health endpoint'
          }
          color="orange"
        />
      </section>

      <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Validation status</div>
            <div className="panel-sub">
              Results are based on the fields currently returned by your API.
            </div>
          </div>
          <ShieldCheck size={19} className="muted" />
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {checks.map((check) => (
            <div
              key={check.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 16,
                border: '1px solid var(--border, #29364b)',
                borderRadius: 12,
              }}
            >
              <div className="ai-symbol">{check.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="panel-title">{check.title}</div>
                <div className="panel-sub" style={{ marginTop: 5 }}>
                  {check.description}
                </div>
              </div>
              <span
                style={{
                  color: check.passed ? '#34d399' : '#fbbf24',
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'right',
                }}
              >
                {check.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ padding: 24, marginBottom: 24 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Analytics rules</div>
            <div className="panel-sub">
              Rules that determine which records contribute to sales metrics.
            </div>
          </div>
          <FileCheck2 size={19} className="muted" />
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="panel-sub">Revenue definition</div>
          <p style={{ lineHeight: 1.8 }}>{metricDefinition}</p>
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="panel-sub">Completed-sales eligibility</div>
          <p style={{ lineHeight: 1.8 }}>
            Only completed transactions with quantity greater than zero are
            included in the sales KPIs and analytics.
          </p>
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="panel-sub">Quarantine reporting</div>
          <p style={{ lineHeight: 1.8 }}>
            Records with missing or invalid required values should be excluded
            from the accepted dataset and reported by ingestion. The current
            health endpoint does not expose the source-row or quarantine counts,
            so this page does not assume those values.
          </p>
        </div>
      </section>

      <button className="refresh" onClick={onBack}>
        <ArrowLeft size={15} /> Back to overview
      </button>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
