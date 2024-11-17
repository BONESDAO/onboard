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

export async function GET(request: NextRequest) {
  try {
    const { authenticated, message } = await authenticateToken(request)

    if (!authenticated) {
      return NextResponse.json({ message }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'all'
    const search = url.searchParams.get('search') || ''

    const pool = createPool()
    try {
      let query = 'SELECT * FROM pending_submissions'
      let params: string[] = []

      if (status !== 'all') {
        query += ' WHERE status = ?'
        params.push(status)
      }

      if (search) {
        query += (status !== 'all' ? ' AND' : ' WHERE') + 
          ' (metamask_account LIKE ? OR discord LIKE ? OR wechat LIKE ? OR telegram LIKE ? OR lattice_x_forum LIKE ? OR referrer LIKE ?)'
        params.push(...Array(6).fill(`%${search}%`))
      }

      query += ' ORDER BY created_at DESC'

      const [rows] = await pool.query(query, params)
      return NextResponse.json(rows)
    } catch (error) {
      console.error('查询数据库时出错:', error)
      return NextResponse.json({ message: '数据库查询错误' }, { status: 500 })
    } finally {
      await pool.end()
    }
  } catch (error) {
    console.error('获取提交时出错:', error)
    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 })
  }
}