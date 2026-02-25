import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Mail, User, Lock, ArrowRight, LogIn } from 'lucide-react';
import { register } from '../lib/api';

interface RegisterFormProps {
  onRegisterSuccess: (email: string, username: string, password: string) => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onRegisterSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const isStrongPassword = (pw: string) => {
    return (
      pw.length >= 8 &&
      /[a-z]/.test(pw) &&
      /[A-Z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw)
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedUsername) newErrors.username = 'Username is required';
    else if (normalizedUsername.length < 3) newErrors.username = 'Username must be at least 3 characters';

    if (!normalizedEmail) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) newErrors.email = 'Please enter a valid email address';

    if (!password) newErrors.password = 'Password is required';
    else if (!isStrongPassword(password))
      newErrors.password =
        'Password must be 8+ chars and include uppercase, lowercase, number, and special character';

    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim();

      await register(normalizedEmail, normalizedUsername, password);
      onRegisterSuccess(normalizedEmail, normalizedUsername, password);
    } catch (err: any) {
      setErrors({ api: err?.message || 'Failed to register / send OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='w-full max-w-md'>
      <div className='mb-4 rounded-2xl bg-gradient-to-r from-[#071a3a] to-[#0b2a5b] p-[2px] shadow-2xl'>
        <Card className='rounded-2xl bg-[#071a3a] text-white border-white/10'>
          <CardHeader className='space-y-2'>
            <CardTitle className='text-2xl'>Join Our Community</CardTitle>
            <CardDescription className='text-white/70'>
              Help reunite lost items with their owners
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='username' className='text-white/80'>
                  Username
                </Label>
                <div className='relative'>
                  <User className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/50' />
                  <Input
                    id='username'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className='pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-white/30'
                    autoComplete='username'
                  />
                </div>
                {errors.username && <p className='text-sm text-red-300'>{errors.username}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='email' className='text-white/80'>
                  University Email
                </Label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/50' />
                  <Input
                    id='email'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-white/30'
                    autoComplete='email'
                  />
                </div>
                {errors.email && <p className='text-sm text-red-300'>{errors.email}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password' className='text-white/80'>
                  Password
                </Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/50' />
                  <Input
                    id='password'
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-white/30'
                    autoComplete='new-password'
                  />
                </div>
                {errors.password && <p className='text-sm text-red-300'>{errors.password}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='confirmPassword' className='text-white/80'>
                  Confirm Password
                </Label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/50' />
                  <Input
                    id='confirmPassword'
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className='pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 focus-visible:ring-white/30'
                    autoComplete='new-password'
                  />
                </div>
                {errors.confirmPassword && <p className='text-sm text-red-300'>{errors.confirmPassword}</p>}
              </div>

              {errors.api && (
                <div className='rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200'>
                  {errors.api}
                </div>
              )}

              <Button
                type='submit'
                className='w-full gap-2 bg-[#0b2a5b] hover:bg-[#0e3470] text-white'
                disabled={isLoading}
              >
                {isLoading ? 'Sending OTP...' : 'Create Account'}
                {!isLoading && <ArrowRight className='size-4' />}
              </Button>

              <div className='flex items-center gap-3 pt-2'>
                <div className='h-px flex-1 bg-white/15' />
                <span className='text-xs text-white/50'>OR</span>
                <div className='h-px flex-1 bg-white/15' />
              </div>

              <Button
                type='button'
                variant='outline'
                className='w-full gap-2 border-white/20 text-white hover:bg-white/10'
                onClick={onSwitchToLogin}
              >
                <LogIn className='size-4' />
                Sign In
              </Button>
            </form>
          </CardContent>

          <CardFooter className='justify-center text-xs text-white/60'>
            We’ll email you an OTP to verify your account.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}