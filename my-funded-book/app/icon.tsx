import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#080b09", borderRadius: 116, border: "22px solid #263127" }}>
        <svg width="390" height="390" viewBox="0 0 390 390" fill="none">
          <path d="M35 215h62l39-94 58 165 50-126 30 55h81" stroke="#8CFF4F" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M275 80h76v76" stroke="#E9FFE0" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m350 81-126 126" stroke="#E9FFE0" strokeWidth="22" strokeLinecap="round" />
          <circle cx="35" cy="215" r="14" fill="#E9FFE0" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
