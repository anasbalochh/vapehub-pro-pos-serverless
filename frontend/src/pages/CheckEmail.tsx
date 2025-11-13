import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import VapeHubLogo from "@/components/VapeHubLogo";

const CheckEmail = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4 animate-scale-in">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-xl border-2 border-blue-400 transform transition-transform duration-300 hover:scale-110">
              <VapeHubLogo size="lg" variant="contrast" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-slide-up">
            Check Your Email
          </h1>
        </div>

        <Card className="bg-slate-800/95 backdrop-blur-xl border-slate-700 shadow-2xl animate-fade-in transform transition-all duration-300 hover:shadow-blue-500/20" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl text-white">Email Confirmation Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4 animate-slide-up">
              <div className="flex justify-center">
                <div className="rounded-full bg-blue-500/20 p-4 animate-scale-in transform transition-transform duration-300 hover:scale-110">
                  <Mail className="h-12 w-12 text-blue-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  We've sent you a confirmation email
                </h3>
                <p className="text-muted-foreground">
                  Please check your email inbox and click on the confirmation link to activate your account.
                </p>
                <p className="text-sm text-muted-foreground">
                  Once you've confirmed your email, you'll be able to login to your account.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Link to="/login">
                  Go to Login
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-700 transition-all duration-200"
              >
                <Link to="/signup">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign Up
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-center text-muted-foreground">
                Didn't receive the email? Check your spam folder or try signing up again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckEmail;

