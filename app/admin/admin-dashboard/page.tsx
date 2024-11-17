'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from 'next/navigation'

interface Submission {
  id: number
  metamask_account: string
  discord: string
  wechat: string
  telegram: string
  lattice_x_forum: string
  referrer: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type FilterStatus = 'all' | 'approved' | 'rejected' | 'pending'

async function fetchSubmissions(filter: FilterStatus): Promise<Submission[]> {
  const token = localStorage.getItem('adminToken')
  if (!token) {
    throw new Error('Token 不存在')
  }

  try {
    const response = await fetch(`/api/admin/submissions?status=${filter}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('获取提交失败')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('获取数据时发生错误:', error)
    throw error
  }
}

async function updateSubmissionStatus(id: number, status: 'approved' | 'rejected') {
  const token = localStorage.getItem('adminToken')
  if (!token) {
    throw new Error('Token 不存在')
  }

  const response = await fetch('/api/admin/update-submission-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ id, status }),
  })
  
  if (!response.ok) {
    throw new Error('更新提交状态失败')
  }

  return response.json()
}

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const router = useRouter()

  useEffect(() => {
    loadSubmissions()
  }, [filter])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const data = await fetchSubmissions(filter)
      setSubmissions(data)
      setError('')
    } catch (err) {
      setError('加载提交失败')
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await updateSubmissionStatus(id, status)
      await loadSubmissions()
    } catch (err) {
      setError('更新状态失败')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    router.push('/admin/admin-login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">管理员仪表板</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setFilter('pending')} variant={filter === 'pending' ? 'default' : 'outline'}>待审核</Button>
          <Button onClick={() => setFilter('approved')} variant={filter === 'approved' ? 'default' : 'outline'}>已通过</Button>
          <Button onClick={() => setFilter('rejected')} variant={filter === 'rejected' ? 'default' : 'outline'}>未通过</Button>
          <Button onClick={() => setFilter('all')} variant={filter === 'all' ? 'default' : 'outline'}>全部</Button>
          <Button onClick={handleLogout}>登出</Button>
        </div>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p>加载中...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MetaMask 账户</TableHead>
              <TableHead>Discord</TableHead>
              <TableHead>微信</TableHead>
              <TableHead>Telegram</TableHead>
              <TableHead>LatticeX Forum</TableHead>
              <TableHead>推荐人</TableHead>
              <TableHead>提交时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  没有符合条件的信息
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.metamask_account}</TableCell>
                  <TableCell>{submission.discord}</TableCell>
                  <TableCell>{submission.wechat}</TableCell>
                  <TableCell>{submission.telegram}</TableCell>
                  <TableCell>{submission.lattice_x_forum}</TableCell>
                  <TableCell>{submission.referrer}</TableCell>
                  <TableCell>{new Date(submission.created_at).toLocaleString()}</TableCell>
                  <TableCell>{submission.status === 'approved' ? '已通过' : submission.status === 'rejected' ? '未通过' : '待审核'}</TableCell>
                  <TableCell>
                    {submission.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleStatusUpdate(submission.id, 'approved')}
                          className="mr-2"
                        >
                          通过
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(submission.id, 'rejected')}
                          variant="destructive"
                        >
                          拒绝
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}