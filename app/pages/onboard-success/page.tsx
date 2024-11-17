'use client'
import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function OnboardSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-[#4CAF50] mb-4">提交成功</h1>
        <p className="text-center text-gray-600 mb-6">
          感谢您提交 BONESDAO 的登船信息。我们已经收到您的申请，并将尽快处理。
        </p>
        <div className="text-center">
          <Link href="/">
            <Button className="w-full text-white bg-[#4CAF50] hover:bg-[#81cf83]">
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
