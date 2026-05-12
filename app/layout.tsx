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
          <PushSubscriber />
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
