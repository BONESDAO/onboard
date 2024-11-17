import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import jwt from 'jsonwebtoken'
import { ethers } from 'ethers'

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
    const { address, signature, message } = await request.json()
    console.log('Received login request for address:', address)

    if (!address || !signature || !message) {
      console.log('Missing address, signature, or message')
      return NextResponse.json({ message: '地址、签名和消息都是必需的' }, { status: 400 })
    }

    const connection = await pool.getConnection()
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM admins WHERE ethereum_address = ?',
        [address.toLowerCase()]
      )
      console.log('Database query result:', rows)

      if (!Array.isArray(rows) || rows.length === 0) {
        console.log('No admin found with address:', address)
        return NextResponse.json({ message: '无效的管理员地址' }, { status: 401 })
      }

      const admin = rows[0] as any

      // Verify the signature
      const expectedMessage = `Login to Admin Dashboard: ${address.toLowerCase()}`
      if (message !== expectedMessage) {
        console.log('Invalid message for address:', address)
        return NextResponse.json({ message: '无效的消息' }, { status: 401 })
      }

      const recoveredAddress = ethers.utils.verifyMessage(message, signature)

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        console.log('Invalid signature for address:', address)
        return NextResponse.json({ message: '无效的签名' }, { status: 401 })
      }

      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error('JWT_SECRET is not set')
        return NextResponse.json({ message: '服务器配置错误' }, { status: 500 })
      }

      const token = jwt.sign(
        { id: admin.id, address: admin.ethereum_address },
        jwtSecret,
        { expiresIn: '1h' }
      )

      console.log('Login successful for address:', address)
      return NextResponse.json({ token })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json({ message: '内部服务器错误' }, { status: 500 })
  }
}