import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parecer+ · Comunicação Clínica Hospitalar",
  description:
    "Plataforma de gestão de interconsultas, plantões e comunicação clínica hospitalar.",
  manifest: "/manifest.webmanifest",
  applicationName: "Parecer+",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Parecer+",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d7d78",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applied before paint so the theme never flashes.
const themeScript = `
try {
  var t = localStorage.getItem('hcw-theme');
  var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
