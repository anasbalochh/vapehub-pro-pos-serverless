import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import BusinessLogo from "@/components/BusinessLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessName } from "@/hooks/useBusinessName";

const Login = () => {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const businessName = useBusinessName();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            console.log('Login page: Attempting login for', formData.email);
            await login(formData.email, formData.password);
            console.log('Login page: Login successful, waiting for state update...');
            // Wait a bit longer to ensure user state is set and isLoading is false
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('Login page: Navigating to dashboard...');
            toast.success("Login successful!");
                navigate("/", { replace: true });
        } catch (error: any) {
            console.error('Login page: Login error', error);
            const errorMessage = error?.message || "Login failed. Please check your credentials.";
                    toast.error(errorMessage, {
                        duration: 5000,
                    });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
            </div>

            <Card className="w-full max-w-md border-slate-700 bg-slate-800/95 backdrop-blur-xl shadow-2xl animate-fade-in relative z-10 transform transition-all duration-300 hover:shadow-blue-500/20">
                <CardHeader className="text-center space-y-4">
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-xl animate-scale-in transform transition-transform duration-300 hover:scale-110 ${
                        user?.logoUrl
                          ? 'bg-transparent p-2'
                          : 'bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400'
                    }`}>
                        <BusinessLogo size="lg" variant="contrast" />
                    </div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-slide-up">
                        {businessName}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        Sign in to access your dashboard
                    </p>
                </CardHeader>
                <CardContent className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 transition-colors group-focus-within:text-blue-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-200"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 transition-colors group-focus-within:text-blue-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                                    className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-200"
                                    required
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-10 hover:bg-slate-600/50 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4 text-muted-foreground hover:text-blue-400 transition-colors" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-muted-foreground hover:text-blue-400 transition-colors" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 underline-offset-4 hover:underline"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link
                                to="/signup"
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 underline-offset-4 hover:underline"
                            >
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
