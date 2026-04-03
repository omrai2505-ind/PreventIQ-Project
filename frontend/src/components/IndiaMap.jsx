import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";

// ── Inline state risk data (no extra API call needed for static data) ──
const STATE_RISK = {
  "andhra pradesh": "medium", "arunachal pradesh": "high", "assam": "high",
  "bihar": "high", "chhattisgarh": "high", "goa": "low", "gujarat": "medium",
  "haryana": "medium", "himachal pradesh": "low", "jharkhand": "high",
  "karnataka": "medium", "kerala": "low", "madhya pradesh": "high",
  "maharashtra": "high", "manipur": "high", "meghalaya": "high",
  "mizoram": "medium", "nagaland": "high", "odisha": "high", "punjab": "medium",
  "rajasthan": "high", "sikkim": "medium", "tamil nadu": "low",
  "telangana": "medium", "tripura": "medium", "uttar pradesh": "high",
  "uttarakhand": "medium", "west bengon": "medium", "west bengal": "medium",
  "delhi": "medium", "jammu and kashmir": "medium", "jammu & kashmir": "medium",
  "ladakh": "high", "chandigarh": "low", "puducherry": "low",
  "andaman and nicobar islands": "medium", "andaman and nicobar": "medium",
  "dadra and nagar haveli and daman and diu": "medium",
  "dadra and nagar haveli": "medium", "daman and diu": "medium",
  "lakshadweep": "medium",
};

const RISK_COLORS = {
  low:     "#15803d",
  medium:  "#b45309",
  high:    "#b91c1c",
  default: "#1e293b",
};

// Some GeoJSON sources spell things differently
const ALIASES = {
  "nct of delhi": "delhi",
  "odisha": "odisha",
  "orissa": "odisha",
  "uttaranchal": "uttarakhand",
  "jammu & kashmir": "jammu and kashmir",
  "andaman & nicobar islands": "andaman and nicobar",
};

function getStateName(feature) {
  const p = feature?.properties || {};
  return p.NAME_1 || p.ST_NM || p.state || p.State || p.name || p.NAME || "";
}

function normaliseState(raw) {
  const lower = (raw || "").toLowerCase().trim();
  return ALIASES[lower] ?? lower;
}

const INDIA_CENTER = [22.5, 82.5];
const INDIA_ZOOM   = 4.5;

const IndiaMap = ({ onStateClick }) => {
  const [geoData, setGeoData] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [toast,   setToast]   = useState(null);
  const geoRef = useRef(null);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson"
    )
      .then((r) => r.json())
      .then(setGeoData)
      .catch((e) => console.error("India GeoJSON error:", e));
  }, []);

  // Re-style on hover
  useEffect(() => {
    if (!geoRef.current) return;
    geoRef.current.eachLayer((layer) => {
      const raw = getStateName(layer.feature);
      const key = normaliseState(raw);
      const risk = STATE_RISK[key] || "default";
      const isMH  = key === "maharashtra";
      const isHov = hovered === key;

      layer.setStyle({
        fillColor:   RISK_COLORS[risk] || RISK_COLORS.default,
        fillOpacity: isHov ? 0.92 : isMH ? 0.82 : 0.65,
        weight:      isHov || isMH ? 2 : 0.8,
        color:       isMH ? "#06b6d4" : isHov ? "#94a3b8" : "#334155",
      });
    });
  }, [hovered]);

  const style = useCallback((feature) => {
    const key  = normaliseState(getStateName(feature));
    const risk = STATE_RISK[key] || "default";
    const isMH = key === "maharashtra";
    return {
      fillColor:   RISK_COLORS[risk] || RISK_COLORS.default,
      fillOpacity: isMH ? 0.82 : 0.65,
      weight:      isMH ? 2 : 0.8,
      color:       isMH ? "#06b6d4" : "#334155",
    };
  }, []);

  const onEachFeature = useCallback((feature, layer) => {
    const raw = getStateName(feature);
    const key = normaliseState(raw);
    const isMH = key === "maharashtra";

    layer.on({
      mouseover: () => setHovered(key),
      mouseout:  () => setHovered(null),
      click: () => {
        if (isMH) {
          onStateClick("maharashtra");
        } else {
          setToast(`${raw || "This state"} — data coming soon`);
          setTimeout(() => setToast(null), 2500);
        }
      },
    });
  }, [onStateClick]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer
        center={INDIA_CENTER}
        zoom={INDIA_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OSM &copy; CARTO'
          maxZoom={12}
        />
        {geoData && (
          <GeoJSON
            key="india-geo"
            ref={geoRef}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      {/* Hover state label */}
      {hovered && (
        <div style={S.stateLabel}>
          <div style={S.stateLabelName}>
            {hovered === "maharashtra" ? "Maharashtra" : hovered.replace(/\b\w/g, c => c.toUpperCase())}
          </div>
          <div style={{ fontSize: 10, color: hovered === "maharashtra" ? "#06b6d4" : "#64748b", marginTop: 2 }}>
            {hovered === "maharashtra"
              ? "▶ Click to explore districts"
              : `Risk: ${STATE_RISK[hovered] || "unknown"}`}
          </div>
        </div>
      )}

      {/* Toast for non-MH states */}
      {toast && (
        <div style={S.toast}>{toast}</div>
      )}

      {/* Bottom legend */}
      <div style={S.legend}>
        {[["low","#15803d","Low Risk"],["medium","#b45309","Medium Risk"],["high","#b91c1c","High Risk"]].map(
          ([k, c, l]) => (
            <div key={k} style={S.legendRow}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c, boxShadow: `0 0 6px ${c}` }} />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{l}</span>
            </div>
          )
        )}
      </div>

      {/* Hint overlay */}
      <div style={S.hint}>
        <div style={S.hintInner}>
          <span style={{ color: "#06b6d4", fontWeight: 700 }}>↓</span>
          &nbsp;Click <span style={{ color: "#06b6d4" }}>Maharashtra</span> to explore district data
        </div>
      </div>
    </div>
  );
};

const S = {
  stateLabel: {
    position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
    background: "rgba(10,22,40,0.9)", border: "1px solid #1a2d50",
    borderRadius: 8, padding: "8px 16px", pointerEvents: "none",
    zIndex: 1000, textAlign: "center", backdropFilter: "blur(8px)",
    animation: "slideUp 0.2s ease both",
  },
  stateLabelName: { fontSize: 14, fontWeight: 700, color: "#e2e8f0" },
  toast: {
    position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
    background: "rgba(15,30,56,0.95)", border: "1px solid #334155",
    borderRadius: 8, padding: "8px 20px", pointerEvents: "none",
    zIndex: 1000, fontSize: 12, color: "#94a3b8",
    animation: "slideUp 0.2s ease both",
  },
  legend: {
    position: "absolute", bottom: 24, left: 24, zIndex: 1000,
    background: "rgba(10,22,40,0.88)", border: "1px solid #1a2d50",
    borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(10px)",
    display: "flex", flexDirection: "column", gap: 6,
  },
  legendRow: { display: "flex", alignItems: "center", gap: 8 },
  hint: {
    position: "absolute", top: 16, right: 16, zIndex: 1000,
  },
  hintInner: {
    background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.3)",
    borderRadius: 8, padding: "8px 14px",
    fontSize: 12, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace",
    animation: "glowPulse 2.5s ease infinite",
  },
};

export default IndiaMap;
