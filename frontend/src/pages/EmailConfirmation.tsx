import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Mail, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import VapeHubLogo from "@/components/VapeHubLogo";
import { toast } from "sonner";

const EmailConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Supabase automatically handles email confirmation via URL hash
        // Check for session after Supabase processes the confirmation
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user?.email_confirmed_at) {
          setStatus('success');
          setMessage('Email confirmed successfully! You can now login.');
          toast.success('Email confirmed!');

          // Ensure user record exists
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .single();

            if (!userData) {
              await supabase.from('users').insert([{
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
                role: 'user',
                is_active: true,
                theme_preference: 'light'
              }]);
            }
          } catch {
            // User will be created on login if needed
          }
        } else {
          // Wait a moment for Supabase to process the confirmation
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession?.user?.email_confirmed_at) {
              setStatus('success');
              setMessage('Email confirmed successfully! You can now login.');
              toast.success('Email confirmed!');
            } else {
              setStatus('error');
              setMessage('Invalid or expired confirmation link. Please try signing up again.');
            }
          }, 1000);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

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
            Email Confirmation
          </h1>
        </div>

        <Card className="bg-slate-800/95 backdrop-blur-xl border-slate-700 shadow-2xl animate-fade-in transform transition-all duration-300 hover:shadow-blue-500/20" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl text-white">Email Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === 'loading' && (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-500"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-blue-500/30"></div>
                </div>
                <p className="text-muted-foreground">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4 animate-slide-up">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-500/20 p-4 animate-scale-in transform transition-transform duration-300 hover:scale-110">
                    <CheckCircle2 className="h-12 w-12 text-green-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-green-400">
                    Email Confirmed Successfully!
                  </h3>
                  <p className="text-muted-foreground">{message}</p>
                </div>
                <Button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Go to Login
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4 animate-slide-up">
                <div className="flex justify-center">
                  <div className="rounded-full bg-red-500/20 p-4 animate-scale-in transform transition-transform duration-300 hover:scale-110">
                    <AlertCircle className="h-12 w-12 text-red-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-red-400">
                    Verification Failed
                  </h3>
                  <p className="text-muted-foreground">{message}</p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={handleLogin}
                    variant="outline"
                    className="w-full border-slate-600 text-white hover:bg-slate-700 transition-all duration-200"
                  >
                    Go to Login
                  </Button>
                  <Button
                    onClick={() => navigate('/signup')}
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-white hover:bg-slate-700 transition-all duration-200"
                  >
                    Back to Sign Up
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Check your email for the confirmation link</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirmation;

