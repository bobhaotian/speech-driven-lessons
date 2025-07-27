"use client"

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useAuth, auth } from "@/auth/firebase";

// Predefined user credentials
const USERS = {
    user1: 'password1',
    user2: 'password2',
};

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [localLoading, setLocalLoading] = useState(false);
    const router = useRouter();
    const { signInWithGoogle, loading, userEmail } = useAuth();

    const features = [
        {
            text: "Adaptive Learning",
            icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            description: "Tailored to your unique pace and style",
        },
        {
            text: "Real-time Feedback",
            icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
            description: "Instant guidance for continuous improvement",
        },
        {
            text: "AI-Powered Insights",
            icon: "M13 10V3L4 14h7v7l9-11h-7z",
            description: "Intelligent analysis for optimized learning paths",
        },
    ];

    useEffect(() => {
        // On first render, sign out to ensure no lingering session interferes before explicit sign-in
        auth.signOut().catch(err => {
            console.warn("Initial sign-out failed (might be expected if not logged in):", err);
        });
    }, []); // Empty dependency array ensures this runs only once on mount

    const handleGoogleSignIn = async () => {
        try {
            console.log('Starting Google sign in...');
            setLocalLoading(true);
            setError('');
            
            const result = await signInWithGoogle();
            console.log('Sign in result:', result);
            
            if (result.success) {
                console.log('Sign in successful, redirecting to welcome');
                router.push('/welcome');
            } else {
                setError(result.error?.toString() || 'Failed to sign in with Google');
                setLocalLoading(false);
            }
        } catch (error) {
            console.error('Error during Google sign in:', error);
            setError('Error signing in with Google');
            setLocalLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Using email as username for this example
        const username = email.split('@')[0]; // Simple conversion from email to username

        // Type assertion to access USERS with string index
        if ((USERS as {[key: string]: string})[username] === password) {
            const encodedCredentials = btoa(`${username}:${password}`);
            document.cookie = `auth=${encodedCredentials}; Path=/; SameSite=None; Secure;`;
            router.push('/welcome');
        } else {
            console.log('Invalid email or password');
            setError('Invalid email or password');
        }
    };

    if (loading || localLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#7A9E7E] via-[#E8EFE8] to-[#F5F7F5] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7A9E7E] mx-auto"></div>
                    <p className="mt-4 text-[#5D745F]">
                        {localLoading ? "Verifying your account..." : "Loading..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#7A9E7E] via-[#E8EFE8] to-[#F5F7F5] flex font-sans antialiased flex-col lg:flex-row">
            {/* Left Section */}
            <div className="w-full lg:w-3/5 flex flex-col items-center justify-center relative overflow-hidden p-4 lg:p-12 bg-gradient-to-br from-[#4c7b54] to-[#5C7E60]">
                <AnimatedBackground />
                <div className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#E8EFE8] to-[#F5F7F5] w-full flex flex-col items-center">
                    <motion.div
                        className="text-center mb-8 lg:mb-16 w-full"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <div className="w-full">
                            <h1
                                className="font-extrabold tracking-tight bg-clip-text bg-gradient-to-r from-[#A5C0A7] to-[#F5F7F5] text-transparent mb-4 lg:mb-6 pb-2"
                                style={{
                                    fontSize: 'clamp(1.875rem, 4vw + 1rem, 4.5rem)',
                                    lineHeight: '1.2',
                                    whiteSpace: 'normal',
                                    overflowWrap: 'break-word',
                                    width: 'calc(100% - 2rem)',
                                    marginLeft: 'auto',
                                    marginRight: 'auto',
                                }}
                            >
                                Beyond Traditional Learning
                            </h1>
                        </div>
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-light tracking-wide text-[#F5F7F5] max-w-3xl mx-auto mt-6">
                            Experience AI-driven education that adapts to your pace, learns from your style, and guides your journey
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    >
                        {features.map(({ text, icon, description }, index) => (
                            <motion.div
                                key={text}
                                className="flex flex-col items-center text-center p-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.2 }}
                            >
                                <div className="mb-3 sm:mb-4 lg:mb-6 p-3 sm:p-4 bg-[#7A9E7E] rounded-full">
                                    <svg
                                        className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-[#F5F7F5]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 lg:mb-3 tracking-wide text-[#F5F7F5]">
                                    {text}
                                </h3>
                                <p className="text-sm sm:text-base lg:text-lg text-[#E8EFE8] font-light leading-relaxed">
                                    {description}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Right Section */}
            <div className="w-full lg:w-2/5 bg-[#E8EFE8] flex items-center justify-center min-h-screen lg:min-h-0">
                <motion.div
                    className="w-full max-w-md p-6 lg:p-12 bg-[#F5F7F5] shadow-lg rounded-lg border border-[#BED0BF]"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-center text-[#2C3E50] tracking-tight">Welcome Back</h2>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                        <div>
                            <Label htmlFor="email" className="text-sm font-medium text-[#5D745F] tracking-wide">
                                Username
                            </Label>
                            <Input
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 font-light border border-[#BED0BF] rounded-md"
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="password" className="text-sm font-medium text-[#5D745F] tracking-wide">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 font-light border border-[#BED0BF] rounded-md"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-br from-[#7A9E7E] to-[#5C7E60] hover:from-[#5C7E60] hover:to-[#7A9E7E] transition-colors duration-300 py-4 lg:py-6 text-base lg:text-lg font-medium tracking-wide text-white rounded-lg"
                        >
                            Sign In
                        </Button>
                    </form>
                    <div className="mt-4 lg:mt-6">
                        <Button
                            variant="outline"
                            className="w-full py-4 lg:py-6 text-base lg:text-lg font-medium tracking-wide border border-[#BED0BF] bg-[#F5F7F5] text-[#7A9E7E] rounded-lg hover:bg-[#E8EFE8]"
                            onClick={handleGoogleSignIn}
                        >
                            <svg className="w-5 h-5 mr-2 text-[#5C7E60]" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                                <path fill="none" d="M1 1h22v22H1z" />
                            </svg>
                            Sign in with Google
                        </Button>
                    </div>
                    <p className="mt-6 lg:mt-8 text-center text-sm text-[#5D745F] tracking-wide">
                        Don't have an account?{" "}
                        <a href="#" className="text-[#7A9E7E] hover:text-[#5C7E60] font-medium">
                            Sign up
                        </a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
