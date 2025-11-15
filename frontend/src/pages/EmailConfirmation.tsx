import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Mail, AlertCircle, Loader2 } from "lucide-react";
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
        // Supabase handles email confirmation via URL hash fragments (#access_token=...)
        // The hash contains the confirmation token that Supabase needs to process
        // Check if we have a hash in the URL
        const hash = window.location.hash;
        
        if (!hash || hash.length === 0) {
          // No hash found - might be a direct visit or the hash was already processed
          // Check if we already have a confirmed session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email_confirmed_at) {
            setStatus('success');
            setMessage('Your account is confirmed! You can now login.');
            return;
          } else {
            setStatus('error');
            setMessage('No confirmation token found. Please check your email and use the confirmation link.');
            return;
          }
        }
        
        // Parse hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // If we have a token in the hash, Supabase needs to process it
        if (accessToken && type === 'recovery') {
          // This is a password reset, not email confirmation
          navigate('/reset-password');
          return;
        }

        // Check if there's a confirmation token in the hash
        if (accessToken) {
          // Let Supabase process the hash and exchange it for a session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
          }

          // Also try to get the user from the URL hash
          const { data: hashData, error: hashError } = await supabase.auth.getUser();

          if (hashError) {
            console.error('Hash processing error:', hashError);
          }

          // Wait a moment for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Check for session after Supabase processes the confirmation
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user?.email_confirmed_at) {
          setStatus('success');
          setMessage('Your account is confirmed! You can now login.');
          toast.success('Email confirmed successfully!');

          // Ensure user record exists and is activated
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .single();

            if (!userData) {
              // Create user record if it doesn't exist
              await supabase.from('users').insert([{
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
                business_name: session.user.user_metadata?.business_name || session.user.email?.split('@')[0] || 'My Business',
                role: 'user',
                is_active: true,
                theme_preference: 'light'
              }]);
            } else {
              // Update user to active if they were created as inactive
              await supabase
                .from('users')
                .update({ is_active: true })
                .eq('id', session.user.id);
            }
          } catch (error) {
            console.error('Error creating/updating user:', error);
            // User will be created on login if needed
          }

          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          // Wait a bit more and retry
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession?.user?.email_confirmed_at) {
              setStatus('success');
              setMessage('Your account is confirmed! You can now login.');
              toast.success('Email confirmed successfully!');
              window.history.replaceState(null, '', window.location.pathname);
            } else {
              setStatus('error');
              setMessage('Invalid or expired confirmation link. Please try signing up again.');
            }
          }, 2000);
        }
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage('Failed to verify email. Please try again or contact support.');
      }
    };

    verifyEmail();
  }, [navigate]);

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
              <div className="text-center space-y-6 animate-slide-up">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-500/20 p-4 animate-scale-in transform transition-transform duration-300 hover:scale-110">
                    <CheckCircle2 className="h-16 w-16 text-green-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-green-400">
                    Your Account is Confirmed!
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    You can now login to your account.
                  </p>
                </div>
                <Button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-lg py-6"
                  size="lg"
                >
                  Go to Login Page
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

