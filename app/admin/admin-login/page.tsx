'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'

async function loginAdminWithMetamask(address: string, signature: string, message: string) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, signature, message }),
  })
  
  if (!response.ok) {
    throw new Error('登录失败，请检查您的 Metamask 连接')
  }
  
  return response.json()
}

export default function AdminLogin() {
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')
  const [isMetamaskInstalled, setIsMetamaskInstalled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      setIsMetamaskInstalled(true)
    }
  }, [])

  const connectWallet = async () => {
    if (!isMetamaskInstalled) {
      setError('请安装 Metamask 以继续')
      return
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])
      setAddress(accounts[0])
    } catch (err) {
      console.error('Failed to connect wallet:', err)
      setError('连接钱包失败，请重试')
    }
  }

  const handleLogin = async () => {
    if (!isMetamaskInstalled) {
      setError('请安装 Metamask 以继续')
      return
    }

    try {
      if (!address) {
        setError('请先连接您的 Metamask 钱包')
        return
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      
      // Create a unique message for the user to sign
      const message = `Login to Admin Dashboard: ${address.toLowerCase()}`
      const signature = await signer.signMessage(message)

      const data = await loginAdminWithMetamask(address.toLowerCase(), signature, message)
      
      if (data.token) {
        localStorage.setItem('adminToken', data.token)
        router.push('/admin/admin-dashboard')
      } else {
        setError('登录失败，请确保您使用的是授权的管理员地址')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('登录失败，请重试')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">管理员登录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isMetamaskInstalled ? (
              <p className="text-center text-red-500">请安装 Metamask 以继续</p>
            ) : !address ? (
              <Button onClick={connectWallet} className="w-full">连接 Metamask</Button>
            ) : (
              <>
                <p className="text-center">已连接地址: {address}</p>
                <Button onClick={handleLogin} className="w-full">登录</Button>
              </>
            )}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}