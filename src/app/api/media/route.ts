// src/app/api/media/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import mime from 'mime'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bot = searchParams.get('bot')
  const file = searchParams.get('file')

  if (!bot || !file) {
    return new NextResponse("Missing params", { status: 400 })
  }

  // Zabezpieczenie przed wyjściem poza folder (directory traversal attack)
  const cleanBot = bot.replace(/[^a-zA-Z0-9-]/g, '')
  const cleanFile = path.basename(file)

  const filePath = path.join(process.cwd(), 'bots', cleanBot, 'media', cleanFile)

  try {
    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const contentType = mime.getType(filePath) || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: { 'Content-Type': contentType }
    })
  } catch (error) {
    return new NextResponse("Server Error", { status: 500 })
  }
}
