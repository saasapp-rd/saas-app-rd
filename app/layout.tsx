import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import PushSubscriber from "@/components/PushSubscriber"
import Providers      from "@/components/Providers"
import BottomNav      from "@/components/BottomNav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title:       "SAAS - Missing Students",
  description: "Seattle Academy attendance and safety tracker",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {/*
            App-shell layout:
            - Outer div is exactly viewport height, no overflow
            - Inner scroll div holds all page content and scrolls
            - BottomNav sits BELOW the scroll div — never inside it
            This is far more reliable than position:fixed across iOS/Android.
          */}
          <div style={{
            display:       "flex",
            flexDirection: "column",
            height:        "100dvh",
            overflow:      "hidden",
          }}>
            <div id="app-scroll"
                 style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
              <PushSubscriber />
              {children}
            </div>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  )
}
