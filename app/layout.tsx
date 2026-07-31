import type { Metadata } from "next";
import "./globals.css";

const title = "FloorPlanOnline Commercial | Order Property Media & Plans";
const description =
  "Order commercial property photography, 2D and 3D floor plans, space planning, 3D tours, CAD files and item tagging.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
