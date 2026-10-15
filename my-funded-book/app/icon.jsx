import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#050506", borderRadius: 116 }}>
      <svg width="400" height="400" viewBox="0 0 28 28" fill="none">
        <path d="M1 15.5 8.2 13.6" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M11 3.5 3.5 22.5h15L11 3.5Z" fill="rgba(198,244,50,.12)" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14.4 13.2 18.6 15.4l3.4-5 5-5" stroke="#c6f432" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="27" cy="5.4" r="1.3" fill="#c6f432" />
      </svg>
    </div>,
    { ...size }
  );
}
