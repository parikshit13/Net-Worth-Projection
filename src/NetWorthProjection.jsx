import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Net Worth Projection — compounding swing-trade model               */
/* ------------------------------------------------------------------ */

const C = {
  bg: "#0A0B0D",
  panel: "#121417",
  line: "#1F242B",
  lineSoft: "#191D22",
  text: "#E8EBEF",
  textDim: "#8A929C",
  textFaint: "#5A626C",
  accent: "#3DDC97",
  loss: "#F0626E",
  amber: "#E0A458",
  grid: "#1A1E23",
};

const MONO =
  '"SF Mono", "JetBrains Mono", "Roboto Mono", ui-monospace, Menlo, monospace';
const SANS =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const fmtMoney = (n, dp = 0) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

const fmtPct = (n) => `${n.toFixed(1)}%`;

function buildProjection({
  startCapital,
  splitPct,
  profitPct,
  lossPct,
  winTrades,
  lossTrades,
  months,
}) {
  const winM = Math.pow(1 + profitPct / 100, winTrades);
  const lossM = Math.pow(1 - lossPct / 100, lossTrades);
  const factor = winM * lossM;

  const rows = [];
  let capital = startCapital;

  rows.push({
    month: 0,
    portion: startCapital * (splitPct / 100),
    gain: 0,
    capital,
  });

  for (let m = 1; m <= months; m++) {
    const portion = capital * (splitPct / 100);
    const gain = portion * factor - portion;
    capital = capital + gain;
    rows.push({ month: m, portion, gain, capital });
  }
  return { rows, factor };
}

function Stat({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        padding: "16px 18px",
        flex: 1,
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.textFaint,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 24,
          fontWeight: 600,
          color: accent || C.text,
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            color: C.textDim,
            marginTop: 8,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Control({ label, value, suffix, hint, min, max, step, onChange }) {
  // Typed values may exceed slider bounds and carry arbitrary decimals.
  // Local text state lets the user type freely ("4.", "8.375") and commits
  // any valid number; the slider clamps its own display but never the value.
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = (raw) => {
    const n = parseFloat(raw);
    if (!isNaN(n) && isFinite(n)) onChange(n);
    else setText(String(value));
  };

  const sliderVal = Math.min(max, Math.max(min, value));
  const pct = ((sliderVal - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 10,
        }}
      >
        <span style={{ fontFamily: SANS, fontSize: 12.5, color: C.textDim }}>
          {label}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#0E1013",
            border: `1px solid ${focused ? C.accent : C.line}`,
            borderRadius: 8,
            padding: "4px 10px",
            transition: "border-color 120ms ease",
          }}
        >
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              commit(e.target.value);
            }}
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              // live-commit while typing when it's already a valid number
              const n = parseFloat(v);
              if (!isNaN(n) && isFinite(n) && v.trim() !== "" && !/[.]$/.test(v.trim()))
                onChange(n);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(e.target.value);
                e.target.blur();
              }
            }}
            style={{
              width: 84,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: MONO,
              fontSize: 14,
              color: C.text,
              fontWeight: 600,
              textAlign: "right",
              padding: 0,
            }}
          />
          {suffix && (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: C.textFaint,
              }}
            >
              {suffix}
            </span>
          )}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderVal}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%",
          height: 4,
          borderRadius: 4,
          appearance: "none",
          WebkitAppearance: "none",
          outline: "none",
          cursor: "pointer",
          background: `linear-gradient(90deg, ${C.accent} 0%, ${C.accent} ${pct}%, ${C.line} ${pct}%, ${C.line} 100%)`,
        }}
      />
      {hint && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: C.textFaint,
            marginTop: 7,
            textAlign: "right",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function ChartTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#0E1013",
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: "12px 14px",
        fontFamily: MONO,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 8 }}>
        {d.month === 0 ? "STARTING POINT" : `MONTH ${d.month}`}
      </div>
      <div style={{ fontSize: 16, color: C.accent, fontWeight: 600 }}>
        {fmtMoney(d.capital, 0)}
      </div>
      {d.month > 0 && (
        <div style={{ fontSize: 12, color: C.textDim, marginTop: 6 }}>
          +{fmtMoney(d.gain, 0)} this month
        </div>
      )}
    </div>
  );
}

export default function NetWorthProjection() {
  const [startCapital, setStartCapital] = useState(4000);
  const [splitPct, setSplitPct] = useState(25);
  const [profitPct, setProfitPct] = useState(8);
  const [lossPct, setLossPct] = useState(4.5);
  const [winTrades, setWinTrades] = useState(5);
  const [lossTrades, setLossTrades] = useState(3);
  const [months, setMonths] = useState(24);
  const [showTable, setShowTable] = useState(false);

  const wrapRef = useRef(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = wrapRef.current?.offsetWidth || window.innerWidth;
      setNarrow(w < 820);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { rows, factor } = useMemo(
    () =>
      buildProjection({
        startCapital,
        splitPct,
        profitPct,
        lossPct,
        winTrades,
        lossTrades,
        months,
      }),
    [startCapital, splitPct, profitPct, lossPct, winTrades, lossTrades, months]
  );

  const final = rows[rows.length - 1].capital;
  const totalGain = final - startCapital;
  const multiple = final / startCapital;
  const avgMonthly = totalGain / months;
  const monthlyRoi = (Math.pow(multiple, 1 / months) - 1) * 100;
  const profitable = factor > 1;

  const reset = () => {
    setStartCapital(4000);
    setSplitPct(25);
    setProfitPct(8);
    setLossPct(4.5);
    setWinTrades(5);
    setLossTrades(3);
    setMonths(24);
  };

  return (
    <div
      ref={wrapRef}
      style={{
        background: C.bg,
        minHeight: "100vh",
        padding: narrow ? "20px 16px 40px" : "36px 40px 56px",
        fontFamily: SANS,
        color: C.text,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{ marginBottom: narrow ? 24 : 32, maxWidth: 1240, margin: "0 auto" }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.22em",
            color: C.accent,
            marginBottom: 10,
          }}
        >
          COMPOUNDING&nbsp;·&nbsp;SWING&nbsp;MODEL
        </div>
        <h1
          style={{
            fontSize: narrow ? 26 : 34,
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Net Worth Projection
        </h1>
        <p
          style={{
            color: C.textDim,
            fontSize: 14,
            marginTop: 10,
            marginBottom: 0,
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Each month a fixed split of total capital is deployed, compounded
          through your win/loss trade profile, and rolled back into the base.
        </p>
      </div>

      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: narrow ? "1fr" : "340px 1fr",
          gap: narrow ? 20 : 28,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 18,
            padding: narrow ? "22px 20px" : "26px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: "0.16em",
                color: C.textFaint,
              }}
            >
              PARAMETERS
            </span>
            <button
              onClick={reset}
              style={{
                background: "transparent",
                border: `1px solid ${C.line}`,
                color: C.textDim,
                fontFamily: MONO,
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 8,
                cursor: "pointer",
                letterSpacing: "0.06em",
              }}
            >
              RESET
            </button>
          </div>

          <Control
            label="Total capital"
            value={startCapital}
            suffix="$"
            min={500}
            max={100000}
            step={500}
            onChange={setStartCapital}
          />
          <Control
            label="Split / portion size"
            value={splitPct}
            suffix="%"
            hint={`portion: ${fmtMoney(startCapital * (splitPct / 100), 2)}`}
            min={5}
            max={100}
            step={1}
            onChange={setSplitPct}
          />
          <Control
            label="Avg trade profit"
            value={profitPct}
            suffix="%"
            min={0.5}
            max={25}
            step={0.5}
            onChange={setProfitPct}
          />
          <Control
            label="Avg trade loss"
            value={lossPct}
            suffix="%"
            min={0.5}
            max={25}
            step={0.5}
            onChange={setLossPct}
          />
          <Control
            label="Profitable trades / month"
            value={winTrades}
            suffix="/mo"
            min={0}
            max={30}
            step={1}
            onChange={setWinTrades}
          />
          <Control
            label="Losing trades / month"
            value={lossTrades}
            suffix="/mo"
            min={0}
            max={30}
            step={1}
            onChange={setLossTrades}
          />
          <Control
            label="Horizon"
            value={months}
            suffix="mo"
            min={1}
            max={120}
            step={1}
            onChange={(v) => setMonths(Math.max(1, Math.round(v)))}
          />

          <div
            style={{
              marginTop: 18,
              paddingTop: 18,
              borderTop: `1px solid ${C.lineSoft}`,
              fontFamily: MONO,
              fontSize: 12,
              color: C.textDim,
              lineHeight: 1.6,
            }}
          >
            Monthly gross multiple on deployed portion:{" "}
            <span style={{ color: profitable ? C.accent : C.loss }}>
              {factor.toFixed(4)}×
            </span>
            {!profitable && (
              <div style={{ color: C.loss, marginTop: 6 }}>
                ⚠ Edge is negative — capital erodes over time.
              </div>
            )}
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <Stat
              label="Final net worth"
              value={fmtMoney(final)}
              sub={`after ${months} months`}
              accent={C.accent}
            />
            <Stat
              label="Total gain"
              value={`${totalGain >= 0 ? "+" : ""}${fmtMoney(totalGain)}`}
              sub={`${multiple.toFixed(2)}× starting`}
              accent={totalGain >= 0 ? C.text : C.loss}
            />
            <Stat
              label="Avg / month"
              value={`${avgMonthly >= 0 ? "+" : ""}${fmtMoney(avgMonthly)}`}
              sub={`${monthlyRoi.toFixed(2)}% CMGR`}
              accent={C.amber}
            />
          </div>

          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 18,
              padding: narrow ? "18px 12px 12px" : "24px 24px 14px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: "0.16em",
                color: C.textFaint,
                marginBottom: 18,
                paddingLeft: narrow ? 6 : 0,
              }}
            >
              CAPITAL TRAJECTORY
            </div>
            <ResponsiveContainer width="100%" height={narrow ? 260 : 360}>
              <AreaChart
                data={rows}
                margin={{ top: 6, right: 8, left: 6, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={C.grid}
                  strokeDasharray="0"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke={C.textFaint}
                  tick={{ fontSize: 11, fontFamily: MONO, fill: C.textFaint }}
                  tickLine={false}
                  axisLine={{ stroke: C.line }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  stroke={C.textFaint}
                  tick={{ fontSize: 11, fontFamily: MONO, fill: C.textFaint }}
                  tickLine={false}
                  axisLine={false}
                  width={narrow ? 44 : 60}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                  }
                />
                <Tooltip content={<ChartTip />} cursor={{ stroke: C.line }} />
                <ReferenceLine
                  y={startCapital}
                  stroke={C.textFaint}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="capital"
                  stroke={C.accent}
                  strokeWidth={2.5}
                  fill="url(#cap)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: C.accent,
                    stroke: C.bg,
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setShowTable((s) => !s)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                padding: "18px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                color: C.text,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  color: C.textFaint,
                }}
              >
                MONTHLY BREAKDOWN
              </span>
              <span
                style={{ fontFamily: MONO, fontSize: 12, color: C.textDim }}
              >
                {showTable ? "− HIDE" : "+ SHOW"}
              </span>
            </button>

            {showTable && (
              <div
                style={{
                  maxHeight: 380,
                  overflowY: "auto",
                  borderTop: `1px solid ${C.lineSoft}`,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontFamily: MONO,
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr>
                      {["Mo", "Deployed", "Gain", "Net worth"].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            textAlign: i === 0 ? "left" : "right",
                            padding: "12px 22px",
                            color: C.textFaint,
                            fontWeight: 500,
                            fontSize: 11,
                            letterSpacing: "0.08em",
                            position: "sticky",
                            top: 0,
                            background: C.panel,
                            borderBottom: `1px solid ${C.lineSoft}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.month}>
                        <td
                          style={{
                            padding: "11px 22px",
                            color: C.textDim,
                            borderBottom: `1px solid ${C.lineSoft}`,
                          }}
                        >
                          {r.month === 0 ? "—" : r.month}
                        </td>
                        <td
                          style={{
                            padding: "11px 22px",
                            textAlign: "right",
                            color: C.textDim,
                            borderBottom: `1px solid ${C.lineSoft}`,
                          }}
                        >
                          {fmtMoney(r.portion)}
                        </td>
                        <td
                          style={{
                            padding: "11px 22px",
                            textAlign: "right",
                            color:
                              r.gain > 0
                                ? C.accent
                                : r.gain < 0
                                ? C.loss
                                : C.textFaint,
                            borderBottom: `1px solid ${C.lineSoft}`,
                          }}
                        >
                          {r.month === 0
                            ? "—"
                            : `${r.gain >= 0 ? "+" : ""}${fmtMoney(r.gain)}`}
                        </td>
                        <td
                          style={{
                            padding: "11px 22px",
                            textAlign: "right",
                            color: C.text,
                            fontWeight: 600,
                            borderBottom: `1px solid ${C.lineSoft}`,
                          }}
                        >
                          {fmtMoney(r.capital)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: C.textFaint,
              marginTop: 18,
              lineHeight: 1.6,
            }}
          >
            Model: gain = portion × (1+profit)^wins × (1−loss)^losses − portion.
            Deterministic averages — real results vary with trade sequencing,
            slippage, and variance.
          </div>
        </div>
      </div>
    </div>
  );
}
