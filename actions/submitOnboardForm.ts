'use server'

import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT),
  queueLimit: 0
})

export async function submitOnboardForm(formData: FormData) {
  const metamaskAccount = formData.get('metamaskAccount') as string
  const discord = formData.get('discord') as string
  const wechat = formData.get('wechat') as string
  const telegram = formData.get('telegram') as string
  const latticeXForum = formData.get('latticeXForum') as string
  const referrer = formData.get('referrer') as string

  try {
    const connection = await pool.getConnection()
    try {
      // Check if the MetaMask account has already submitted or is pending
      const [existingSubmissions] = await connection.execute(
        'SELECT * FROM pending_submissions WHERE metamask_account = ?',
        [metamaskAccount]
      )

      if (Array.isArray(existingSubmissions) && existingSubmissions.length > 0) {
        const submission = existingSubmissions[0] as any
        if (submission.status === 'pending') {
          return { error: '该 MetaMask 账户的提交正在审核中。' }
        } else if (submission.status === 'approved') {
          return { error: '该 MetaMask 账户已经提交过表单并通过审核。' }
        }
      }

      // Insert the new submission into pending_submissions
      await connection.execute(
        'INSERT INTO pending_submissions (metamask_account, discord, wechat, telegram, lattice_x_forum, referrer) VALUES (?, ?, ?, ?, ?, ?)',
        [metamaskAccount, discord, wechat, telegram, latticeXForum, referrer]
      )

      return { success: true, message: '表单已提交，正在等待审核。' }
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('提交表单失败:', error)
    return { error: '提交表单失败。请稍后再试。' }
  }
}

export async function checkSubmissionStatus(metamaskAccount: string) {
  try {
    const connection = await pool.getConnection()
    try {
      const [submissions] = await connection.execute(
        'SELECT status FROM pending_submissions WHERE metamask_account = ?',
        [metamaskAccount]
      )

      if (Array.isArray(submissions) && submissions.length > 0) {
        const submission = submissions[0] as any
        return { status: submission.status }
      } else {
        return { status: 'not_submitted' }
      }
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('检查提交状态失败:', error)
    return { error: '检查提交状态失败。请稍后再试。' }
  }
}