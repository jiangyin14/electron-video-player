import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '视频播放器',
  description: '基于Next.js的现代化视频播放网站',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
} 