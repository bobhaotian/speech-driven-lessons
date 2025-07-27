"use client"

import { HeaderOnlyLayout } from "@/components/layout/HeaderOnlyLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PublishSidebar } from "@/components/my-publish/publish-page-sidebar"
import { Button } from "@/components/ui/button"
import { DollarSign, TrendingUp, CreditCard, Wallet, Plus } from "lucide-react"

export default function MonetizationCenterPage() {
  return (
    <HeaderOnlyLayout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <PublishSidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 bg-white">
          <ScrollArea className="h-[calc(100vh-64px)]">
            <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-12 sm:pt-16 pb-16">
              {/* Page Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Monetization Center</h1>
                <p className="text-gray-500 mt-2">Manage your earnings and payment options</p>
              </div>
              
              {/* Revenue Overview */}
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
                <div className="flex items-center mb-6">
                  <DollarSign className="h-6 w-6 mr-2 text-teal-500" />
                  <h2 className="text-xl font-bold text-gray-800">Revenue Overview</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-sm text-gray-500 mb-2">Current Balance</h3>
                    <p className="text-2xl font-bold text-gray-800">$1,245.89</p>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-sm text-gray-500 mb-2">This Month</h3>
                    <p className="text-2xl font-bold text-gray-800">$582.30</p>
                    <div className="flex items-center text-teal-500 text-sm mt-2">
                      <TrendingUp className="h-3.5 w-3.5 mr-1" />
                      <span>12% from last month</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-sm text-gray-500 mb-2">Next Payout</h3>
                    <p className="text-2xl font-bold text-gray-800">$1,245.89</p>
                    <p className="text-xs text-gray-500 mt-2">Scheduled for Jun 30, 2023</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button className="bg-teal-500 hover:bg-teal-600 text-white border-0">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Withdraw Funds
                  </Button>
                </div>
              </div>
              
              {/* Revenue Sources */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
                <h3 className="font-semibold text-gray-800 text-lg mb-6">Revenue Sources</h3>
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-teal-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 font-medium">Course Sales</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">$845.40</span>
                      <span className="text-gray-500 text-sm ml-2">(68%)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 font-medium">Affiliate Commission</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">$246.20</span>
                      <span className="text-gray-500 text-sm ml-2">(20%)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-gray-700 font-medium">Consultation Fees</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">$154.29</span>
                      <span className="text-gray-500 text-sm ml-2">(12%)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Methods */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-800 text-lg">Payment Methods</h3>
                  <Button size="sm" className="bg-gray-800 text-white hover:bg-gray-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add New
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className="bg-gray-200 p-2 rounded-md mr-4">
                        <CreditCard className="h-6 w-6 text-gray-700" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Visa ending in 4242</p>
                        <p className="text-sm text-gray-500">Expires 05/2025</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-gray-300">Edit</Button>
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      <span className="text-sm text-gray-500">Default</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className="bg-gray-200 p-2 rounded-md mr-4">
                        <Wallet className="h-6 w-6 text-gray-700" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">PayPal</p>
                        <p className="text-sm text-gray-500">example@email.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-gray-300">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900">Make Default</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </HeaderOnlyLayout>
  )
} 