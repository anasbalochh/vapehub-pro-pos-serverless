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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <VapeHubLogo size="lg" variant="contrast" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Email Confirmation
          </h1>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl">Email Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === 'loading' && (
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
                    <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                    Email Confirmed Successfully!
                  </h3>
                  <p className="text-muted-foreground">{message}</p>
                </div>
                <Button
                  onClick={handleLogin}
                  className="w-full bg-gradient-primary shadow-glow"
                >
                  Go to Login
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-red-100 dark:bg-red-900 p-4">
                    <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                    Verification Failed
                  </h3>
                  <p className="text-muted-foreground">{message}</p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={handleLogin}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                  <Button
                    onClick={() => navigate('/signup')}
                    variant="ghost"
                    className="w-full"
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

