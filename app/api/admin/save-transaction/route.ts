import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'

const createPool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10
  });
}

const authenticateToken = async (request: NextRequest): Promise<{ authenticated: boolean; message: string }> => {
  const authHeader = headers().get('authorization')

  if (!authHeader) {
    return { authenticated: false, message: '缺少Authorization头部' }
  }

  const token = authHeader.split(' ')[1]

  if (!token) {
    return { authenticated: false, message: '缺少token' }
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET环境变量未设置')
    return { authenticated: false, message: '服务器配置错误' }
  }

  return new Promise((resolve) => {
    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
      if (err) {
        console.error('JWT验证失败:', err)
        if (err.name === 'TokenExpiredError') {
          resolve({ authenticated: false, message: 'Token已过期' })
        } else {
          resolve({ authenticated: false, message: '无效的token' })
        }
      } else {
        resolve({ authenticated: true, message: '认证成功' })
      }
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const { authenticated, message } = await authenticateToken(request)

    if (!authenticated) {
      return NextResponse.json({ error: message }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received transaction data:', body)

    const { admin_metamask_account, recipient_metamask_account, recipient_lattice_x_forum, transaction_type, amount } = body

    if (!admin_metamask_account || !recipient_metamask_account || !recipient_lattice_x_forum || !transaction_type || !amount) {
      console.log('Missing fields:', { admin_metamask_account, recipient_metamask_account, recipient_lattice_x_forum, transaction_type, amount })
      return NextResponse.json({ error: '缺少必要的字段' }, { status: 400 })
    }

    const pool = createPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [result]: any = await connection.execute(
        'INSERT INTO transaction_records (admin_metamask_account, recipient_metamask_account, recipient_lattice_x_forum, transaction_type, amount) VALUES (?, ?, ?, ?, ?)',
        [admin_metamask_account, recipient_metamask_account, recipient_lattice_x_forum, transaction_type, amount]
      )

      await connection.commit()

      return NextResponse.json({ message: '交易记录保存成功', id: result.insertId }, { status: 201 })
    } catch (error) {
      await connection.rollback()
      console.error('保存交易记录时发生错误:', error)
      return NextResponse.json({ error: '保存交易记录失败' }, { status: 500 })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('处理请求时发生错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}