import { ImageResponse } from "next/og";

/** The link preview shown when the site is shared. */
export const alt = "Hospitality — understand your health policy before you're at the admission desk";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#f7f4f1",
          backgroundImage:
            "radial-gradient(circle at 88% 8%, rgba(233,168,107,0.28), transparent 45%), radial-gradient(circle at 8% 100%, rgba(185,156,196,0.35), transparent 55%)",
          color: "#221a29",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#5a3570" />
            <path d="M7 26V16.5a9 9 0 0 1 18 0V26" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M12.8 26v-4.6a3.2 3.2 0 0 1 6.4 0V26" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="16" cy="13.6" r="1.7" fill="#e9a86b" />
          </svg>
          <div style={{ fontSize: 36, letterSpacing: -0.5 }}>Hospitality</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.04, letterSpacing: -2, maxWidth: 900 }}>
            Nobody should have to decode a policy at 3am.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#534859", fontFamily: "sans-serif", maxWidth: 900 }}>
            Your health cover in plain language, every answer linked to its clause.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
