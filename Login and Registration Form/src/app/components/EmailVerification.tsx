import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Mail, CheckCircle, MailCheck } from "lucide-react";

interface EmailVerificationProps {
  email: string;
  onVerificationComplete: () => void;
  onBackToRegister: () => void;
}

export function EmailVerification({ email, onVerificationComplete, onBackToRegister }: EmailVerificationProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = () => {
    setIsResending(true);
    setResendSuccess(false);

    // Simulate API call
    setTimeout(() => {
      setIsResending(false);
      setResendSuccess(true);
      
      setTimeout(() => {
        setResendSuccess(false);
      }, 3000);
    }, 1000);
  };

  const handleVerifyLater = () => {
    onVerificationComplete();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <MailCheck className="size-8 text-blue-600" />
        </div>
        <CardTitle>Verify Your University Email</CardTitle>
        <CardDescription>
          We've sent a verification link to
        </CardDescription>
        <p className="text-sm mt-1">{email}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Mail className="size-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm">Verify to access Lost & Found</p>
              <p className="text-xs text-gray-600">
                Click the verification link in the email to activate your account and start reporting lost items or searching for your belongings. 
                Check your spam folder if you don't see it.
              </p>
            </div>
          </div>
        </div>

        {resendSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600" />
              <p className="text-sm text-green-800">
                Verification email sent successfully!
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResendEmail}
            variant="outline"
            className="w-full"
            disabled={isResending}
          >
            {isResending ? "Sending..." : "Resend Verification Email"}
          </Button>

          <Button
            onClick={handleVerifyLater}
            variant="default"
            className="w-full"
          >
            I'll Verify Later
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBackToRegister}
              className="text-sm text-blue-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}