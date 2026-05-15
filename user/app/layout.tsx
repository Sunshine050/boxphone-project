import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "CloudPhone - Remote Android Device Control",
  description: "Rent and control real Android devices via browser",
   icons: {
    icon: [
      {
        url: '/logo-boxphone.svg',
      },
    ]
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
