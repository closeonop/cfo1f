import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Employee Manager — People & Pay",
  description:
    "One simple place for the CFO and HR to run employees, tiers, raises and pay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-center" richColors duration={4000} />
        </ThemeProvider>
      </body>
    </html>
  );
}
