"use client"
import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Settings,
  LogOut,
  User,
  Mail,
  GraduationCap,
  ChevronRight,
  Cpu,
  Edit3,
  Save,
  KeyRound,
  Shield,
  Sparkles,
  X,
  Bell,
  Clock,
  Zap,
  HardDrive
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { MainLayout } from "@/components/layout/MainLayout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ProfileHeader } from "@/components/profile/ProfileHeader"
import { FullscreenButton } from "@/components/layout/fullscreen-button"

const preferences = [
  { id: "ai_basics", label: "AI Fundamentals" },
  { id: "ml_algorithms", label: "Machine Learning Algorithms" },
  { id: "deep_learning", label: "Deep Learning" },
  { id: "nlp", label: "Natural Language Processing" },
  { id: "cv", label: "Computer Vision" },
  { id: "robotics", label: "AI in Robotics" },
  { id: "ethics", label: "AI Ethics" },
  { id: "data_science", label: "Data Science" },
]

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("Sam Zhong")
  const [email, setEmail] = useState("sam.zhong@uwaterloo.ca")
  const [school, setSchool] = useState("UWaterloo")
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(["ai_basics", "ml_algorithms"])
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    if (!isEditing) {
      setIsOpen(false)
    }
  }, [isEditing])

  // Function to toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Manual tab rendering function
  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-800 font-medium flex items-center mb-2">
                <User className="h-4 w-4 mr-2 text-emerald-700" />
                Name
              </Label>
              <div className="relative group">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className={`bg-white border-gray-300 text-gray-900 font-medium ${
                    isEditing 
                      ? "focus-visible:ring-emerald-200 focus-visible:border-emerald-400" 
                      : "cursor-not-allowed opacity-80"
                  }`}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-800 font-medium flex items-center mb-2">
                <Mail className="h-4 w-4 mr-2 text-emerald-700" />
                Email
              </Label>
              <div className="relative group">
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  className={`bg-white border-gray-300 text-gray-900 font-medium ${
                    isEditing 
                      ? "focus-visible:ring-emerald-200 focus-visible:border-emerald-400" 
                      : "cursor-not-allowed opacity-80"
                  }`}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="school" className="text-gray-800 font-medium flex items-center mb-2">
                <GraduationCap className="h-4 w-4 mr-2 text-emerald-700" />
                School
              </Label>
              <div className="relative group">
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  disabled={!isEditing}
                  className={`bg-white border-gray-300 text-gray-900 font-medium ${
                    isEditing 
                      ? "focus-visible:ring-emerald-200 focus-visible:border-emerald-400" 
                      : "cursor-not-allowed opacity-80"
                  }`}
                />
              </div>
            </div>

            {/* AI-Powered Badge */}
            <Card className="mt-6 border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <div className="rounded-full bg-emerald-100 p-2">
                      <Cpu className="h-4 w-4 text-emerald-700" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-gray-900 font-medium flex items-center">
                      AI Tutor Profile
                      <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">
                        Active
                      </span>
                    </h4>
                    <p className="text-gray-700 text-sm mt-1">
                      Your AI tutor is personalized based on your learning preferences and activity.
                      The more you interact, the more it adapts to your learning style.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "preferences":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-gray-800 font-medium flex items-center mb-2">
                <Sparkles className="h-4 w-4 mr-2 text-emerald-700" />
                Learning Preferences
              </Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => isEditing && setIsOpen(!isOpen)}
                  className={`w-full text-left bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-800 font-medium ${
                    isEditing 
                      ? "cursor-pointer hover:border-emerald-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" 
                      : "cursor-not-allowed opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPreferences.length > 0 ? (
                      selectedPreferences.map((id) => (
                        <div
                          key={id}
                          className="bg-emerald-100 border border-emerald-300 rounded-full px-2 py-0.5 text-xs text-emerald-800 font-medium flex items-center"
                        >
                          {preferences.find((p) => p.id === id)?.label}
                          {isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPreferences(selectedPreferences.filter(p => p !== id))
                              }}
                              className="ml-1 text-emerald-800 hover:text-emerald-900"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-600">Select preferences</span>
                    )}
                  </div>
                </button>

                {isOpen && isEditing && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {preferences.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-2 p-2 hover:bg-emerald-50"
                      >
                        <Checkbox
                          id={item.id}
                          checked={selectedPreferences.includes(item.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPreferences(
                              checked
                                ? [...selectedPreferences, item.id]
                                : selectedPreferences.filter((id) => id !== item.id),
                            )
                          }}
                          className="border-emerald-400 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                        />
                        <label htmlFor={item.id} className="flex-grow cursor-pointer text-gray-800 font-medium">
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Label className="text-gray-800 font-medium flex items-center mb-3">
                <Bell className="h-4 w-4 mr-2 text-emerald-700" />
                Notification Settings
              </Label>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_courses"
                    defaultChecked
                    className="border-emerald-400 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                  />
                  <label htmlFor="notify_courses" className="text-sm text-gray-800 font-medium">Course updates and new materials</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_messages"
                    defaultChecked
                    className="border-emerald-400 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                  />
                  <label htmlFor="notify_messages" className="text-sm text-gray-800 font-medium">New messages and replies</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_ai"
                    className="border-emerald-400 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                  />
                  <label htmlFor="notify_ai" className="text-sm text-gray-800 font-medium">AI-generated learning suggestions</label>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Label className="text-gray-800 font-medium flex items-center mb-3">
                <Cpu className="h-4 w-4 mr-2 text-emerald-700" />
                AI Assistant Preferences
              </Label>

              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ai_hints"
                          defaultChecked
                          className="border-emerald-400 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                        />
                        <label htmlFor="ai_hints" className="text-sm text-gray-800 font-medium">Show AI hints during courses</label>
                      </div>
                      <div className="text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                        Recommended
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ai_recommend"
                        defaultChecked
                        className="border-emerald-400 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                      />
                      <label htmlFor="ai_recommend" className="text-sm text-gray-800 font-medium">Personalized course recommendations</label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ai_analysis"
                        defaultChecked
                        className="border-emerald-400 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                      />
                      <label htmlFor="ai_analysis" className="text-sm text-gray-800 font-medium">AI learning pattern analysis</label>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center">
                      <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-700 mr-2">
                        <HardDrive className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs text-gray-700 font-medium">
                        Your AI learning data is securely stored and used only to improve your experience.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-gray-900 font-semibold mb-3 flex items-center">
                <KeyRound className="h-4 w-4 mr-2 text-emerald-700" />
                Password & Authentication
              </h3>

              <Card className="border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-emerald-100 p-2 rounded-full mr-3 group-hover:bg-emerald-100 transition-colors">
                        <KeyRound className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">Change Password</div>
                        <div className="text-xs text-gray-600 mt-0.5">Last changed 45 days ago</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-gray-900 font-semibold mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-emerald-700" />
                Active Sessions
              </h3>

              <Card className="border-gray-200 mb-4">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-900 font-medium">Current Session</div>
                      <div className="text-xs text-gray-600 mt-0.5">Chrome on Windows • Toronto, Canada</div>
                    </div>
                    <div className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full flex items-center font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
                      Active Now
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 w-full font-medium">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out All Devices
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 bg-gray-50 relative">
        <ScrollArea className="h-[calc(100vh-64px)]" type="hover">
          {/* Fullscreen button */}
          <FullscreenButton
            isFullScreen={isFullScreen}
            onToggle={toggleFullScreen}
          />

          <div className="max-w-7xl mx-auto px-14 sm:px-20 lg:px-28 pt-16 sm:pt-20 pb-8">
            <section>
              <div className="mb-8">
                <ProfileHeader 
                  title="User Profile" 
                  description="Manage your account information and preferences" 
                />
              </div>
              
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Summary Card - Deepened green colors and improved font visibility */}
                <div className="md:col-span-1">
                  <Card className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-emerald-200 sticky top-6">
                    <div className="relative h-20 bg-gradient-to-r from-emerald-200 to-emerald-100 overflow-hidden">
                      {/* Decorative pattern with improved visibility */}
                      <div className="absolute inset-0 opacity-30" 
                        style={{ 
                          backgroundImage: "linear-gradient(#4b5563 1px, transparent 1px), linear-gradient(90deg, #4b5563 1px, transparent 1px)",
                          backgroundSize: "20px 20px"
                        }}>
                      </div>
                    </div>
                    
                    <CardContent className="pt-0 relative -mt-10 px-5 pb-4">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="w-20 h-20 border-3 border-white shadow-md">
                          <AvatarImage
                            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image.png-FPfEiipvdvhwsMSNzwhzUEfKWZ1Ubm.jpeg"
                            alt="Profile picture of an orange cat"
                          />
                          <AvatarFallback className="text-xl font-bold bg-emerald-700 text-white">SZ</AvatarFallback>
                        </Avatar>
                        
                        <h2 className="mt-3 text-xl font-bold text-gray-900">{name}</h2>
                        <p className="text-emerald-700 font-medium flex items-center justify-center">
                          @samzhong
                          <span className="inline-block ml-2 px-1.5 py-0.5 bg-emerald-100 rounded-full text-[10px] border border-emerald-300 font-semibold">
                            <Zap className="inline-block h-2.5 w-2.5 mr-0.5 text-emerald-700" />
                            PRO
                          </span>
                        </p>
                        <p className="text-gray-700 font-medium mt-0.5">{school}</p>
                        
                        <div className="w-full mt-4 space-y-1.5">
                          <div className="flex items-center justify-between py-1.5 border-t border-gray-200">
                            <span className="text-gray-600 font-medium">Joined</span>
                            <span className="text-gray-900 font-medium">March 2023</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-t border-gray-200">
                            <span className="text-gray-600 font-medium">Courses</span>
                            <span className="text-gray-900 font-medium">12 completed</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-t border-gray-200">
                            <span className="text-gray-600 font-medium">Status</span>
                            <span className="text-emerald-700 font-medium flex items-center">
                              <span className="h-2 w-2 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
                              Active
                            </span>
                          </div>
                        </div>
                        
                        {/* AI stats section with improved contrast */}
                        <div className="mt-4 pt-3 border-t border-gray-200 w-full">
                          <h3 className="text-emerald-700 text-sm font-semibold flex items-center justify-start">
                            <Cpu className="h-3.5 w-3.5 mr-1.5" /> 
                            AI Learning Stats
                          </h3>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                              <div className="text-emerald-700 text-xs font-medium">AI Sessions</div>
                              <div className="text-gray-900 text-base font-bold">28</div>
                            </div>
                            <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                              <div className="text-emerald-700 text-xs font-medium">Score</div>
                              <div className="text-gray-900 text-base font-bold">92%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Settings Area with Custom Tabs - Improved contrast and font weight */}
                <div className="md:col-span-2">
                  <Card className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-emerald-200">
                    <CardHeader className="border-b border-gray-200 bg-white pb-2 px-5 pt-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                          Account Settings
                        </CardTitle>
                        {isEditing ? (
                          <Button
                            onClick={() => {
                              console.log("Saving changes:", { name, email, school, selectedPreferences })
                              setIsEditing(false)
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                            size="sm"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium"
                            size="sm"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    
                    {/* Custom tabs with improved visibility */}
                    <div>
                      <div className="border-b border-gray-200 bg-white flex">
                        <button 
                          className={`h-10 px-5 flex items-center font-medium ${activeTab === 'profile' 
                            ? 'text-gray-900 border-b-2 border-emerald-600' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                          onClick={() => setActiveTab('profile')}
                        >
                          <User className={`h-4 w-4 mr-2 ${activeTab === 'profile' ? 'text-emerald-700' : 'text-gray-500'}`} />
                          Profile
                        </button>
                        <button 
                          className={`h-10 px-5 flex items-center font-medium ${activeTab === 'preferences' 
                            ? 'text-gray-900 border-b-2 border-emerald-600' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                          onClick={() => setActiveTab('preferences')}
                        >
                          <Sparkles className={`h-4 w-4 mr-2 ${activeTab === 'preferences' ? 'text-emerald-700' : 'text-gray-500'}`} />
                          Preferences
                        </button>
                        <button 
                          className={`h-10 px-5 flex items-center font-medium ${activeTab === 'security' 
                            ? 'text-gray-900 border-b-2 border-emerald-600' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                          onClick={() => setActiveTab('security')}
                        >
                          <Shield className={`h-4 w-4 mr-2 ${activeTab === 'security' ? 'text-emerald-700' : 'text-gray-500'}`} />
                          Security
                        </button>
                      </div>
                      
                      <CardContent className="p-5">
                        {renderTabContent()}
                      </CardContent>
                    </div>
                  </Card>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  )
}

