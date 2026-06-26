import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "TripGuru — AI-Powered Travel Planner",
  description:
    "TripGuru uses multi-agent AI to craft personalized multi-day travel itineraries. Hotels, flights, restaurants, and attractions — all planned automatically.",
  keywords: ["travel planner", "AI itinerary", "trip planning", "travel assistant"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
