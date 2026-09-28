import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#050506", borderRadius: 116 }}>
      <svg width="390" height="390" viewBox="0 0 390 390" fill="none">
        <rect x="46" y="46" width="298" height="298" rx="62" fill="#0e0e11" stroke="rgba(255,255,255,.18)" strokeWidth="12" />
        <path d="M92 274V137l54 61 54-84 54 84 54-61v137" stroke="#06b6d4" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>,
    { ...size }
  );
}
