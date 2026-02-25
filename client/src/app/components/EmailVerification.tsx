import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Mail, CheckCircle, MailCheck } from 'lucide-react';
import { register, verifyOtp } from '../lib/api';

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
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);
    setError(null);
    try {
      await register(email, username, password);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP');
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
      setError(err?.message || 'OTP verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className='w-full max-w-md'>
      {/* Card made more opaque + higher contrast for photo backgrounds */}
      <Card className='rounded-2xl bg-white/95 border border-slate-200 shadow-2xl'>
        <CardHeader className='text-center space-y-2'>
          <div className='mx-auto mb-2 w-16 h-16 bg-slate-900/5 rounded-full flex items-center justify-center'>
            <MailCheck className='size-8 text-slate-900' />
          </div>

          <CardTitle className='text-2xl text-slate-900'>Verify Your University Email</CardTitle>
          <CardDescription className='text-slate-600'>Enter the OTP code for</CardDescription>
          <p className='text-sm font-semibold text-slate-900 mt-1 break-all'>{email}</p>
        </CardHeader>

        <CardContent className='space-y-6'>
          {/* Info box with stronger contrast */}
          <div className='bg-white border border-slate-200 rounded-xl p-4'>
            <div className='flex items-start gap-3'>
              <Mail className='size-5 text-slate-900 mt-0.5' />
              <div className='space-y-1'>
                <p className='text-sm font-semibold text-slate-900'>Enter OTP to activate your account</p>
                <p className='text-xs text-slate-600'>
                  If <span className='font-semibold'>EMAIL_MODE=log</span>, the OTP is printed in your backend terminal.
                </p>
              </div>
            </div>
          </div>

          {/* OTP input - stronger border & focus */}
          <Input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder='6-digit OTP'
            inputMode='numeric'
            className='h-11 text-base border-slate-300 focus-visible:ring-slate-900'
          />

          {resendSuccess && (
            <div className='bg-emerald-50 border border-emerald-200 rounded-xl p-4'>
              <div className='flex items-center gap-3'>
                <CheckCircle className='size-5 text-emerald-600' />
                <p className='text-sm font-semibold text-emerald-800'>OTP sent successfully!</p>
              </div>
            </div>
          )}

          {error && (
            <div className='rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
              {error}
            </div>
          )}

          <div className='space-y-3'>
            {/* Navy primary button */}
            <Button
              onClick={handleVerify}
              className='w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold'
              disabled={isVerifying || otp.trim().length < 6}
            >
              {isVerifying ? 'Verifying...' : 'Verify & Continue'}
            </Button>

            {/* High-contrast outline button */}
            <Button
              onClick={handleResendEmail}
              variant='outline'
              className='w-full h-11 rounded-xl border-slate-300 text-slate-900 font-bold hover:bg-slate-50'
              disabled={isResending}
            >
              {isResending ? 'Sending...' : 'Resend OTP'}
            </Button>

            {/* Make it visible over busy backgrounds */}
            <div className='flex justify-center pt-1'>
              <button
                type='button'
                onClick={onBackToRegister}
                className='text-sm font-semibold text-slate-900 underline underline-offset-4 hover:text-slate-700'
              >
                Use a different email
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}