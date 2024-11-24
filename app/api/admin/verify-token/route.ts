import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    
    return NextResponse.json({ success: true, user: decoded })
  } catch (error) {
    console.error('Error verifying token:', error)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

