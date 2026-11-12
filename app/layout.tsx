import type { Metadata } from "next";
import { getCommercialBrand, getCommercialBrandName } from "@/lib/oms-brand";
import "./globals.css";

const description =
  "Order commercial property photography, 2D and 3D floor plans, space planning, 3D tours, CAD files and item tagging.";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getCommercialBrand();
  const title = `${getCommercialBrandName(brand.brandKey, brand.brandConfig)} Commercial | Order Property Media & Plans`;
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
