import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expense Tracking Management - หลังบ้าน",
  description: "ระบบหลังบ้านสำหรับจัดการหมวดหมู่ เมนู และตั้งค่าระบบ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased bg-bg text-text" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
