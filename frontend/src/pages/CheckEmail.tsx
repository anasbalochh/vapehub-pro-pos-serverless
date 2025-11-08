import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import VapeHubLogo from "@/components/VapeHubLogo";

const CheckEmail = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <VapeHubLogo size="lg" variant="contrast" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Check Your Email
          </h1>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl">Email Confirmation Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Mail className="h-12 w-12 text-primary" />
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
                className="w-full bg-gradient-primary shadow-glow"
              >
                <Link to="/login">
                  Go to Login
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full"
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

