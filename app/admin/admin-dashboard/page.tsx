'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ethers } from 'ethers'

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

async function refreshToken() {
  try {
    const response = await fetch('/api/admin/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') }),
    })

    if (!response.ok) {
      throw new Error('Token刷新失败')
    }

    const data = await response.json()
    localStorage.setItem('adminToken', data.token)
    return data.token
  } catch (error) {
    console.error('刷新token时出错:', error)
    throw error
  }
}

async function fetchSubmissions(filter: FilterStatus, search: string): Promise<Submission[]> {
  let token = localStorage.getItem('adminToken')
  if (!token) {
    throw new Error('Token 不存在')
  }

  try {
    const response = await fetch(`/api/admin/submissions?status=${filter}&search=${encodeURIComponent(search)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.status === 401) {
      // Token expired, try to refresh
      token = await refreshToken()
      // Retry the request with the new token
      const retryResponse = await fetch(`/api/admin/submissions?status=${filter}&search=${encodeURIComponent(search)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!retryResponse.ok) {
        throw new Error('获取提交失败')
      }

      return await retryResponse.json()
    }

    if (!response.ok) {
      throw new Error('获取提交失败')
    }

    return await response.json()
  } catch (error) {
    console.error('获取数据时发生错误:', error)
    throw error
  }
}

async function updateSubmissionStatus(id: number, status: 'approved' | 'rejected') {
  let token = localStorage.getItem('adminToken')
  if (!token) {
    throw new Error('Token 不存在')
  }

  try {
    const response = await fetch('/api/admin/update-submission-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id, status }),
    })

    if (response.status === 401) {
      // Token expired, try to refresh
      token = await refreshToken()
      // Retry the request with the new token
      const retryResponse = await fetch('/api/admin/update-submission-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, status }),
      })

      if (!retryResponse.ok) {
        throw new Error('更新提交状态失败')
      }

      return await retryResponse.json()
    }

    if (!response.ok) {
      throw new Error('更新提交状态失败')
    }

    return await response.json()
  } catch (error) {
    console.error('更新状态时出错:', error)
    throw error
  }
}

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [search, setSearch] = useState('')
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadSubmissions()
    setupNetworkListeners()

    return () => {
      removeNetworkListeners()
    }
  }, [filter, search])

  const setupNetworkListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }
  }

  const removeNetworkListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.removeListener('chainChanged', handleChainChanged)
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
    }
  }

  const handleChainChanged = (chainId: string) => {
    setCurrentNetwork(chainId)
    window.location.reload()
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      console.log('请连接到MetaMask。')
    }
    window.location.reload()
  }

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const data = await fetchSubmissions(filter, search)
      setSubmissions(data)
      setError('')
    } catch (err) {
      if (err instanceof Error && err.message === 'Token 不存在') {
        router.push('/admin/admin-login')
      } else {
        setError('加载提交失败')
        setSubmissions([])
      }
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
    localStorage.removeItem('refreshToken')
    router.push('/admin/admin-login')
  }

  const getStatusText = (status: FilterStatus) => {
    switch (status) {
      case 'pending': return '待审核'
      case 'approved': return '已通过'
      case 'rejected': return '未通过'
      case 'all': return '全部'
    }
  }

  const handleTransactionClick = async (account: string) => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask 未安装!')
      return
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const network = await provider.getNetwork()
      setCurrentNetwork(network.chainId.toString())

      setSelectedAccount(account)
      setIsTransactionModalOpen(true)
    } catch (error) {
      console.error('连接MetaMask失败:', error)
      alert('连接MetaMask失败。请确保MetaMask已解锁并授权此网站。')
    }
  }

  const switchToPlatONNetwork = async (provider: ethers.providers.Web3Provider) => {
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: '0x33679' }])
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [{
            chainId: '0x33679',
            chainName: 'PlatON Mainnet',
            nativeCurrency: {
              name: 'LAT',
              symbol: 'lat',
              decimals: 18
            },
            rpcUrls: ['https://openapi.platon.network/rpc'],
            blockExplorerUrls: ['https://scan.platon.network/']
          }])
        } catch (addError) {
          throw new Error('无法添加PlatON Mainnet到MetaMask')
        }
      } else {
        throw switchError
      }
    }
  }

  const handleTransactionConfirm = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask 未安装!')
      return
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      
      const network = await provider.getNetwork()
      if (network.chainId !== 210425) {
        await switchToPlatONNetwork(provider)
      }

      const updatedProvider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = updatedProvider.getSigner()
      
      if (isNaN(parseFloat(transactionAmount)) || parseFloat(transactionAmount) <= 0) {
        throw new Error('请输入有效的lat数量')
      }

      const tx = await signer.sendTransaction({
        to: selectedAccount,
        value: ethers.utils.parseEther(transactionAmount)
      })
      
      await tx.wait()
      alert('交易成功!')
      setIsTransactionModalOpen(false)
      setTransactionAmount('')
    } catch (error) {
      console.error('交易失败:', error)
      let errorMessage = '交易失败。'
      if (error instanceof Error) {
        errorMessage += ' ' + error.message
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage += ' ' + (error as { message: string }).message
      }
      alert(errorMessage)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">AdminDashboard</h1>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="搜索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setFilter('pending')} variant={filter === 'pending' ? 'default' : 'outline'}>待审核</Button>
          <Button onClick={() => setFilter('approved')} variant={filter === 'approved' ? 'default' : 'outline'}>已通过</Button>
          <Button onClick={() => setFilter('rejected')} variant={filter === 'rejected' ? 'default' : 'outline'}>未通过</Button>
          <Button onClick={() => setFilter('all')} variant={filter === 'all' ? 'default' : 'outline'}>全部</Button>
          <Button onClick={handleLogout}>登出</Button>
        </div>
      </div>
      <div className="mb-4 text-sm text-gray-600">
        {getStatusText(filter)}人数为: {submissions.length}
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
                    {submission.status === 'approved' && (
                      <Button
                        onClick={() => handleTransactionClick(submission.metamask_account)}
                        className="mr-2"
                      >
                        交易
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>发起交易</DialogTitle>
            <DialogDescription>
              您正在向以下账户发起lat交易：
              <br />
              {selectedAccount}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                lat数量
              </Label>
              <Input
                id="amount"
                type="number"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            {currentNetwork && (
              <div className="text-sm text-gray-500">
                当前网络: {currentNetwork === '0x33679' ? 'PlatON Mainnet' : '未知网络'}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleTransactionConfirm}>确认交易</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}