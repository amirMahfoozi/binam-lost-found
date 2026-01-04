// EmailVerification.tsx
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Mail, CheckCircle, MailCheck } from "lucide-react";
import { register, verifyOtp } from "../lib/api";

interface EmailVerificationProps {
  email: string;
  username: string;
  password: string;
  onVerificationComplete: (token: string, user: { uid: string; email: string; username: string }) => void;
  onBackToRegister: () => void;
}

export function EmailVerification({
  email,
  username,
  password,
  onVerificationComplete,
  onBackToRegister,
}: EmailVerificationProps) {
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);
    setError(null);
    try {
      // Your backend's "resend" is just calling /auth/register again
      await register(email, username, password);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const data = await verifyOtp(email, otp);
      onVerificationComplete(data.token, data.user);
    } catch (err: any) {
      setError(err?.message || "OTP verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <MailCheck className="size-8 text-blue-600" />
        </div>
        <CardTitle>Verify Your University Email</CardTitle>
        <CardDescription>Enter the OTP code for</CardDescription>
        <p className="text-sm mt-1">{email}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Mail className="size-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm">Enter OTP to activate your account</p>
              <p className="text-xs text-gray-600">
                If EMAIL_MODE=log, the OTP is printed in your backend terminal.
              </p>
            </div>
          </div>
        </div>

        <Input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="6-digit OTP"
          inputMode="numeric"
        />

        {resendSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600" />
              <p className="text-sm text-green-800">OTP sent successfully!</p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="space-y-3">
          <Button onClick={handleVerify} className="w-full" disabled={isVerifying || otp.trim().length < 6}>
            {isVerifying ? "Verifying..." : "Verify & Continue"}
          </Button>

          <Button onClick={handleResendEmail} variant="outline" className="w-full" disabled={isResending}>
            {isResending ? "Sending..." : "Resend OTP"}
          </Button>

          <div className="text-center">
            <button type="button" onClick={onBackToRegister} className="text-sm text-blue-600 hover:underline">
              Use a different email
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
