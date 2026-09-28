import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "88px", color: "white", background: "#050506", backgroundImage: "radial-gradient(#17363b 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "26px" }}>
        <div style={{ width: "96px", height: "96px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,.18)", borderRadius: "24px", background: "#0e0e11", color: "#06b6d4", fontSize: "50px", fontWeight: 900 }}>M</div>
        <div style={{ fontSize: "34px", letterSpacing: ".22em", fontWeight: 800 }}>MYTRADE<span style={{ color: "#06b6d4" }}>BOOK</span></div>
      </div>
      <div style={{ marginTop: "56px", fontSize: "70px", fontWeight: 800, letterSpacing: "-.04em" }}>Ton exécution.<br />Tes preuves.</div>
      <div style={{ marginTop: "22px", fontSize: "26px", color: "#a1a1aa" }}>Journal de trading pour traders prop firm.</div>
    </div>,
    size
  );
}
