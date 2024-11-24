import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(req: Request) {
  try {
    const { refreshToken } = await req.json()

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 })
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string }

    const newAccessToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '1h' })

    return NextResponse.json({ token: newAccessToken })
  } catch (error) {
    console.error('Error refreshing token:', error)
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
  }
}

