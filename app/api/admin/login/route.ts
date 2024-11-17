import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0
})

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    console.log('Received login request for username:', username)

    if (!username || !password) {
      console.log('Missing username or password')
      return NextResponse.json({ message: '用户名和密码是必需的' }, { status: 400 })
    }

    const connection = await pool.getConnection()
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM admins WHERE username = ?',
        [username]
      )
      console.log('Database query result:', rows)

      if (!Array.isArray(rows) || rows.length === 0) {
        console.log('No user found with username:', username)
        return NextResponse.json({ message: '无效的凭据' }, { status: 401 })
      }

      const admin = rows[0] as any
      const isPasswordValid = await bcrypt.compare(password, admin.password)
      console.log('Password validation result:', isPasswordValid)

      if (!isPasswordValid) {
        console.log('Invalid password for username:', username)
        return NextResponse.json({ message: '无效的凭据' }, { status: 401 })
      }

      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error('JWT_SECRET is not set')
        return NextResponse.json({ message: '服务器配置错误' }, { status: 500 })
      }

      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        jwtSecret,
        { expiresIn: '1h' }
      )

      console.log('Login successful for username:', username)
      return NextResponse.json({ token })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json({ message: '内部服务器错误' }, { status: 500 })
  }
}