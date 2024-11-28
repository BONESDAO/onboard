'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ethers } from 'ethers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import USDT_ABI from './platon_usdt.abi.json'
import { TransactionStats } from "@/components/transaction-stats"

const USDT_CONTRACT_ADDRESS = '0xeac734fb7581D8eB2CE4949B0896FC4E76769509'

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

interface TransactionRecord {
  id: number
  admin_metamask_account: string
  recipient_metamask_account: string
  recipient_lattice_x_forum: string
  transaction_type: 'LAT' | 'USDT'
  amount: string
  transaction_time: string
}

type FilterStatus = 'all' | 'approved' | 'rejected' | 'pending' | 'transactions'

async function refreshToken() {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('Refresh token not found')
    }

    const response = await fetch('/api/admin/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Token刷新失败')
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
      token = await refreshToken()
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

async function updateSubmissionStatus(id: number, status: 'approved' | 'rejected' | 'pending') {
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
      token = await refreshToken()
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

async function saveTransactionRecord(record: Omit<TransactionRecord, 'id' | 'transaction_time'>) {
  let token = localStorage.getItem('adminToken')
  if (!token) {
    throw new Error('Token 不存在')
  }

  try {
    console.log('Sending transaction record:', record)
    const response = await fetch('/api/admin/save-transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(record),
    })

    if (response.status === 401) {
      token = await refreshToken()
      const retryResponse = await fetch('/api/admin/save-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(record),
      })

      if (!retryResponse.ok) {
        const errorData = await retryResponse.json()
        throw new Error(errorData.error || '保存交易记录失败')
      }

      return await retryResponse.json()
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '保存交易记录失败')
    }

    return await response.json()
  } catch (error) {
    console.error('保存交易记录时出错:', error)
    throw error
  }
}

async function fetchTransactionRecords(): Promise<TransactionRecord[]> {
  let token = localStorage.getItem('adminToken')
  if (!token) {
    throw new Error('Token 不存在')
  }

  try {
    const response = await fetch('/api/admin/transaction-records', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.status === 401) {
      token = await refreshToken()
      const retryResponse = await fetch('/api/admin/transaction-records', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!retryResponse.ok) {
        throw new Error('获取交易记录失败')
      }

      return await retryResponse.json()
    }

    if (!response.ok) {
      throw new Error('获取交易记录失败')
    }

    return await response.json()
  } catch (error) {
    console.error('获取交易记录时发生错误:', error)
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
  const [selectedLatticeXForum, setSelectedLatticeXForum] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null)
  const [transactionType, setTransactionType] = useState<'LAT' | 'USDT'>('LAT')
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [transactionRecords, setTransactionRecords] = useState<TransactionRecord[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken')
      if (token) {
        try {
          const response = await fetch('/api/admin/verify-token', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            setIsAuthenticated(true)
            loadData()
          } else {
            // 如果token无效，尝试刷新
            try {
              await refreshToken()
              setIsAuthenticated(true)
              loadData()
            } catch (refreshError) {
              console.error('刷新token失败:', refreshError)
              handleLogout()
            }
          }
        } catch (error) {
          console.error('验证token时出错:', error)
          handleLogout()
        }
      } else {
        handleLogout()
      }
    }

    checkAuth()
    setupNetworkListeners()

    return () => {
      removeNetworkListeners()
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [filter, search, isAuthenticated])

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

  const loadData = async () => {
    try {
      setLoading(true)
      if (filter === 'transactions') {
        const records = await fetchTransactionRecords()
        setTransactionRecords(records)
        setSubmissions([])
      } else {
        const data = await fetchSubmissions(filter, search)
        setSubmissions(data)
        setTransactionRecords([])
      }
      setError('')
    } catch (err) {
      if (err instanceof Error && err.message === 'Token 不存在') {
        handleLogout()
      } else {
        setError('加载数据失败')
        setSubmissions([])
        setTransactionRecords([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected' | 'pending') => {
    try {
      await updateSubmissionStatus(id, status)
      await loadData()
    } catch (err) {
      setError('更新状态失败')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('refreshToken')
    setIsAuthenticated(false)
    router.push('/admin/admin-login')
  }

  const getStatusText = (status: FilterStatus) => {
    switch (status) {
      case 'pending': return '待审核'
      case 'approved': return '已通过'
      case 'rejected': return '未通过'
      case 'all': return '全部'
      case 'transactions': return '交易记录'
    }
  }

  const handleTransactionClick = async (account: string, latticeXForum: string) => {
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
      setSelectedLatticeXForum(latticeXForum)
      setIsTransactionModalOpen(true)
      setTransactionStatus('idle')
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
      setTransactionStatus('pending')
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      
      const network = await provider.getNetwork()
      if (network.chainId !== 210425) {
        await switchToPlatONNetwork(provider)
      }

      const updatedProvider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = updatedProvider.getSigner()
      
      if (isNaN(parseFloat(transactionAmount)) || parseFloat(transactionAmount) <= 0) {
        throw new Error('请输入有效的数量')
      }

      let tx;
      if (transactionType === 'LAT') {
        const balance = await signer.getBalance()
        const amount = ethers.utils.parseEther(transactionAmount)
        if (balance.lt(amount)) {
          throw new Error('LAT余额不足')
        }
        tx = await signer.sendTransaction({
          to: selectedAccount,
          value: amount,
          gasLimit: ethers.utils.hexlify(100000)
        })
      } else {
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer)
        const decimals = await usdtContract.decimals()
        const amount = ethers.utils.parseUnits(transactionAmount, decimals)
        const balance = await usdtContract.balanceOf(await signer.getAddress())
        if (balance.lt(amount)) {
          throw new Error('USDT余额不足')
        }
        tx = await usdtContract.transfer(selectedAccount, amount, {
          gasLimit: ethers.utils.hexlify(200000)
        })
      }
      
      await tx.wait()

      const adminAccount = await signer.getAddress()
      await saveTransactionRecord({
        admin_metamask_account: adminAccount,
        recipient_metamask_account: selectedAccount,
        recipient_lattice_x_forum: selectedLatticeXForum,
        transaction_type: transactionType,
        amount: transactionAmount
      })

      setTransactionStatus('success')
      setTimeout(() => {
        setIsTransactionModalOpen(false)
        setTransactionAmount('')
        setTransactionStatus('idle')
        loadData()
      }, 3000)
    } catch (error) {
      console.error('交易失败:', error)
      setTransactionStatus('error')
      let errorMessage = '交易失败。'
      if (error instanceof Error) {
        errorMessage += ' ' + error.message
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage += ' ' + (error as { message: string }).message
      }
      alert(errorMessage)
    }
  }

  if (!isAuthenticated) {
    return <div>加载中...</div>
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
          <Button onClick={() => setFilter('transactions')} variant={filter === 'transactions' ? 'default' : 'outline'}>交易记录</Button>
          <Button onClick={handleLogout}>登出</Button>
        </div>
      </div>
      <div className="mb-4 text-sm text-gray-600">
        {getStatusText(filter)}数量: {filter === 'transactions' ? transactionRecords.length : submissions.length}
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p>加载中...</p>
      ) : filter === 'transactions' ? (
        <>
         <TransactionStats transactions={transactionRecords} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>管理员账户</TableHead>
              <TableHead>接收账户</TableHead>
              <TableHead>LatticeX Forum</TableHead>
              <TableHead>交易类型</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>交易时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  没有交易记录
                </TableCell>
              </TableRow>
            ) : (
              transactionRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.admin_metamask_account}</TableCell>
                  <TableCell>{record.recipient_metamask_account}</TableCell>
                  <TableCell>{record.recipient_lattice_x_forum}</TableCell>
                  <TableCell>{record.transaction_type}</TableCell>
                  <TableCell>{record.amount}</TableCell>
                  <TableCell>{new Date(record.transaction_time).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </>
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
                          className="mr-2"
                        >
                          拒绝
                        </Button>
                      </>
                    )}
                    {submission.status === 'approved' && (
                      <Button
                        onClick={() => handleTransactionClick(submission.metamask_account, submission.lattice_x_forum)}
                        className="mr-2"
                      >
                        交易
                      </Button>
                    )}
                    {submission.status === 'rejected' && (
                      <Button
                        onClick={() => handleStatusUpdate(submission.id, 'pending')}
                        variant="outline"
                        className="mr-2  hover:bg-black hover:text-white"
                      >
                        重新审核
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
              您正在向以下账户发起交易：
              <br />
              {selectedAccount}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transactionType" className="text-right">
                交易类型
              </Label>
              <Select
                value={transactionType}
                onValueChange={(value: 'LAT' | 'USDT') => setTransactionType(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择交易类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAT">LAT</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                {transactionType} 数量
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
            {transactionStatus === 'idle' && (
              <Button type="submit" onClick={handleTransactionConfirm}>确认交易</Button>
            )}
            {transactionStatus === 'pending' && (
              <div className="text-center">
                <p>正在查询交易结果...</p>
              </div>
            )}
            {transactionStatus === 'success' && (
              <div className="text-center text-green-500">
                <p>交易完成</p>
              </div>
            )}
            {transactionStatus === 'error' && (
              <div className="text-center">
                <p className="text-red-500">交易失败</p>
                <Button onClick={handleTransactionConfirm}>重新交易</Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

