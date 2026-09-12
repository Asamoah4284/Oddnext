import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/api";

export const runtime = "edge";
export const alt = `${BRAND_NAME} daily football tips`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 72,
          background: "#0b0d0c",
          color: "#eef3f0",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#22c55e",
            color: "#070908",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          ON
        </div>
        <div style={{ fontSize: 80, fontWeight: 800, marginTop: 24 }}>{BRAND_NAME}</div>
        <div style={{ fontSize: 30, marginTop: 8, color: "#8d9891" }}>
          Daily tips. VIP codes. Telegram community.
        </div>
      </div>
    ),
    size
  );
}
