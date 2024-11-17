'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatePresence, motion } from "framer-motion"
import Image from 'next/image'
import { submitOnboardForm, checkSubmissionStatus } from '../actions/submitOnboardForm'
import { useRouter } from 'next/navigation'

const referrers = [
  { value: "momonga", label: "momonga" },
]

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function OnboardForm() {
  const [isConnected, setIsConnected] = useState(false)
  const [account, setAccount] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [discord, setDiscord] = useState('')
  const [wechat, setWechat] = useState('')
  const [telegram, setTelegram] = useState('')
  const [latticeXForum, setLatticeXForum] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [submissionStatus, setSubmissionStatus] = useState('not_submitted')
  const router = useRouter()

  useEffect(() => {
    checkConnection()
  }, [])

  useEffect(() => {
    if (isConnected && account) {
      checkStatus()
    }
  }, [isConnected, account])

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setIsConnected(true)
          setAccount(accounts[0])
        }
      } catch (err) {
        console.error('获取账户失败', err)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        
        const platonChainId = '0x335f9'

        if (chainId !== platonChainId) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: platonChainId }],
            })
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: platonChainId,
                      chainName: 'PlatON Main Network',
                      nativeCurrency: {
                        name: 'LAT',
                        symbol: 'LAT',
                        decimals: 18
                      },
                      rpcUrls: ['https://openapi2.platon.network/rpc'],
                      blockExplorerUrls: ['https://scan.platon.network/']
                    },
                  ],
                })
              } catch (addError) {
                throw addError
              }
            } else {
              throw switchError
            }
          }
        }

        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        setIsConnected(true)
        setAccount(accounts[0])
        setError('')
      } catch (err: any) {
        setError(err.message)
      }
    } else {
      setError('请安装 MetaMask')
    }
  }

  const checkStatus = async () => {
    const result = await checkSubmissionStatus(account)
    if (result.status) {
      setSubmissionStatus(result.status)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const missingFields = []
    
    if (!isConnected) {
      missingFields.push('连接 MetaMask')
    }
    
    if (!discord && !wechat && !telegram && !latticeXForum) {
      missingFields.push('至少一个社交媒体账号')
    }
    
    if (!value) {
      missingFields.push('推荐人')
    }

    if (missingFields.length > 0) {
      setToastMessage(`请填写以下必填字段: ${missingFields.join(', ')}`)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    const formData = new FormData()
    formData.append('metamaskAccount', account)
    formData.append('discord', discord)
    formData.append('wechat', wechat)
    formData.append('telegram', telegram)
    formData.append('latticeXForum', latticeXForum)
    formData.append('referrer', value)

    try {
      const result = await submitOnboardForm(formData)
      if (result.error) {
        setToastMessage(result.error)
        setShowToast(true)
        setTimeout(() => setShowToast(false), 5000)
      } else if (result.success) {
        setToastMessage(result.message || '表单提交成功，等待审核。')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 5000)
        checkStatus()
      }
    } catch (error) {
      console.error('提交表单时出错:', error)
      setToastMessage('提交表单失败。请稍后再试。')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
    }
  }

  const renderContactInput = (type: string, value: string, setValue: (value: string) => void, icon: string) => (
    <div className="flex-1 relative">
      <div className="absolute -top-3 left-2 bg-white px-1 text-xs text-[#4CAF50] z-10">
        {type}
      </div>
      <div className="relative border-[#4CAF50] border rounded-md focus-within:ring-1 focus-within:ring-[#4CAF50]">
        <Image 
          src={`/${icon}.png?height=20&width=20`}
          alt={`${type} Icon`}
          width={20} 
          height={20}
          className="absolute left-3 top-1/2 -translate-y-1/2"
        />
        <Input 
          placeholder={`请填写你的 ${type} 账号`}
          className="border-none pl-10 focus-visible:ring-0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={type}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#4CAF50] py-3">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image 
              src="/bons.png?height=24&width=24" 
              alt="Bonesdao Logo" 
              width={24} 
              height={24}
              className="text-white"
            />
            <span className="text-white font-medium text-lg">Bonesdao</span>
          </div>
          <Select defaultValue="zh">
            <SelectTrigger className="w-[80px] bg-transparent border-white text-white">
              <SelectValue placeholder="ZH" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">ZH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-center text-[#4CAF50] mb-12">Onboard BONESDAO</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <Select defaultValue="metamask">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="MetaMask" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metamask">MetaMask</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                className="w-40"
                onClick={connectWallet}
                disabled={isConnected}
              >
                <Image 
                  src="/metamask.png?height=20&width=20" 
                  alt="MetaMask Icon" 
                  width={20} 
                  height={20}
                />
                {isConnected ? '已连接' : '连接 MetaMask'}
              </Button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {isConnected && (
              <div className="text-sm text-gray-600">
                <p>已连接账户: {account.slice(0, 6)}...{account.slice(-4)}</p>
                <p>
                  审核状态: {
                    submissionStatus === 'pending' ? '审核中' :
                    submissionStatus === 'approved' ? '已通过' :
                    submissionStatus === 'rejected' ? '未通过' :
                    '未提交'
                  }
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600 text-center">
              未来你在 BONESDAO 的所有激励都会发送至你连接的这个钱包地址。
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderContactInput("Discord", discord, setDiscord, "discord")}
              {renderContactInput("微信", wechat, setWechat, "WeChat")}
              {renderContactInput("Telegram", telegram, setTelegram, "telegram")}
              {renderContactInput("LatticeX Forum", latticeXForum, setLatticeXForum, "latticeX")}
            </div>
            <p className="text-xs text-gray-500 text-center">
              请填写你的 Discord 账号、微信号、Telegram 账号或 LatticeX Forum 论坛账号（至少填写一个）
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="relative w-[calc(50%-0.5rem)]">
                <div className="absolute -top-3 left-2 bg-white px-1 text-xs text-[#4CAF50] z-10">
                  推荐人（必填）
                </div>
                <Input
                value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setTimeout(() => setOpen(false), 200)}
                  className="border-[#4CAF50] focus:ring-1 focus:ring-[#4CAF50]"
                  aria-label="推荐人"
                />
                {open && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {referrers.filter(referrer => 
                      referrer.label.toLowerCase().includes(value.toLowerCase()) || 
                      referrer.value.toLowerCase().includes(value.toLowerCase())
                    ).map((referrer) => (
                      <div
                        key={referrer.value}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                        onMouseDown={() => {
                          setValue(referrer.label)
                          setOpen(false)
                        }}
                      >
                        {referrer.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              若无推荐人，请选择下方默认推荐人
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="font-medium mb-2">默认推荐人（必选，否则可能造成登船失败）</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">默认推荐人</TableHead>
                    <TableHead className="text-xs">LatticeX Forum 论坛名</TableHead>
                    <TableHead className="text-xs">加好友备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs py-2">momonga</TableCell>
                    <TableCell className="text-xs py-2">BONESDAO</TableCell>
                    <TableCell className="text-xs py-2">BONESDAO</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center">
              <Button 
                type="submit" 
                className="w-1/3 bg-[#4CAF50] hover:bg-[#45a049]"
              >
                提交
              </Button>
            </div>
          </div>
        </form>

        <Card className="bg-gray-50">
          <CardContent className="space-y-4 pt-6">
            <div>
              <h3 className="font-bold mb-2 text-[#4CAF50]">登船 BONESDAO</h3>
              <p className="text-sm">
                BONESDAO 结算将实行自动化改版，请各位贡献者通过 MetaMask 连接 PlatON 地址登记到 BONESDAO。未来每位贡献者将直接使用你的个人钱包地址接受 DAO 激励。
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#4CAF50]">安全提示：</h3>
              <p className="text-sm">
                请放心连接 MetaMask 等去中心化钱包连接网页，不会导致资产丢失，只有使用 MetaMask 签名交易才会存在资产丢失风险。在使用任何 Dapp 的时候，请注意你签名的内容和交易相关，请确认你的签名是你想要执行的操作。
              </p>
            </div>
            <p className="text-sm">
              官网导航请访问 BONESDAO 官方域名：bones.icu
            </p>
          </CardContent>
        </Card>
      </main>

      <footer className="py-4 text-center text-sm text-gray-600">
        <p>Copyright © Bonesdao 2024.</p>
      </footer>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}