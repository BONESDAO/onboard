import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import mysql from 'mysql2/promise'
import jwt from 'jsonwebtoken'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT),
  queueLimit: 0
})

const authenticateToken = async (request: NextRequest): Promise<boolean> => {
  const authHeader = headers().get('authorization')
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) {
    return false
  }

  return new Promise((resolve) => {
    jwt.verify(token, process.env.JWT_SECRET as string, (err: any) => {
      if (err) {
        resolve(false)
      }
      resolve(true)
    })
  })
}

export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateToken(request)
  if (!isAuthenticated) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, status } = body

  if (!id || !status || (status !== 'approved' && status !== 'rejected')) {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
  }

  try {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      const [updateResult] = await connection.execute(
        'UPDATE pending_submissions SET status = ? WHERE id = ?',
        [status, id]
      )

      if ((updateResult as any).affectedRows === 0) {
        await connection.rollback()
        return NextResponse.json({ message: 'Submission not found' }, { status: 404 })
      }

      if (status === 'approved') {
        const [submission] = await connection.execute(
          'SELECT * FROM pending_submissions WHERE id = ?',
          [id]
        )

        if (Array.isArray(submission) && submission.length > 0) {
          const { metamask_account, discord, wechat, telegram, lattice_x_forum, referrer } = submission[0] as any
          await connection.execute(
            'INSERT INTO onboard_submissions (metamask_account, discord, wechat, telegram, lattice_x_forum, referrer) VALUES (?, ?, ?, ?, ?, ?)',
            [metamask_account, discord, wechat, telegram, lattice_x_forum, referrer]
          )
        }
      }

      await connection.commit()
      return NextResponse.json({ message: 'Submission status updated successfully' }, { status: 200 })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Error updating submission status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}