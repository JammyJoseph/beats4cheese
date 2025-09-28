'use client'

import { useState } from 'react'
import { UserWallet } from '@/lib/profile'

interface WalletComponentProps {
  wallet: UserWallet | null
}

export default function WalletComponent({ wallet }: WalletComponentProps) {
  const [isPurchasing, setIsPurchasing] = useState(false)

  const handleBuyCredits = async () => {
    try {
      setIsPurchasing(true)

      const response = await fetch('/api/purchase/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credits: 10 })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert('Failed to start purchase. Please try again.')
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
          <p className="mt-2 text-gray-600">
            Manage your credits and transactions
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Credits Overview */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Credits Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Available Credits</span>
                <span className="text-2xl font-bold text-blue-600">
                  {wallet?.credits || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total Earned</span>
                <span className="text-lg font-semibold text-green-600">
                  {wallet?.totalEarned || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total Spent</span>
                <span className="text-lg font-semibold text-red-600">
                  {wallet?.totalSpent || 0}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <button 
                onClick={handleBuyCredits}
                disabled={isPurchasing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md"
              >
                {isPurchasing ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  'Buy 10 Credits'
                )}
              </button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              <div className="text-center py-8 text-gray-500">
                <p>No transactions yet</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Packages */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Credit Packages</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 className="font-medium text-gray-900">Starter</h4>
              <p className="text-2xl font-bold text-blue-600 mt-2">10 Credits</p>
              <p className="text-sm text-gray-500 mt-1">£10.00</p>
              <button 
                onClick={handleBuyCredits}
                disabled={isPurchasing}
                className="mt-3 w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md"
              >
                {isPurchasing ? 'Processing...' : 'Purchase'}
              </button>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-4 text-center ring-2 ring-blue-500">
              <h4 className="font-medium text-gray-900">Popular</h4>
              <p className="text-2xl font-bold text-blue-600 mt-2">50 Credits</p>
              <p className="text-sm text-gray-500 mt-1">£40.00</p>
              <button 
                onClick={handleBuyCredits}
                disabled={isPurchasing}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md"
              >
                {isPurchasing ? 'Processing...' : 'Purchase'}
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <h4 className="font-medium text-gray-900">Pro</h4>
              <p className="text-2xl font-bold text-blue-600 mt-2">100 Credits</p>
              <p className="text-sm text-gray-500 mt-1">£70.00</p>
              <button 
                onClick={handleBuyCredits}
                disabled={isPurchasing}
                className="mt-3 w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md"
              >
                {isPurchasing ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
