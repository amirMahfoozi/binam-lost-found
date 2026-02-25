import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { login } from '../lib/api';

interface LoginFormProps {
  onLoginSuccess: (token: string, user: { uid: string; email: string; username: string }) => void;
  onSwitchToRegister: () => void;
}

export function LoginForm({ onLoginSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const data = await login(email.trim().toLowerCase(), password);
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrors({ api: err?.message || 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='w-full max-w-md'>
      <div className='mb-4 rounded-2xl bg-gradient-to-r from-[#071a3a] to-[#0b2a5b] p-[2px] shadow-2xl'>
        <Card className='rounded-2xl bg-[#071a3a] text-white border-white/10'>
          <CardHeader className='space-y-2'>
            <CardTitle className='text-2xl'>University Lost &amp; Found</CardTitle>
            <CardDescription className='text-white/70'>
              Sign in to report or search for lost items
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email' className='text-white/80'>
                  Email
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
                    autoComplete='current-password'
                  />
                </div>
                {errors.password && <p className='text-sm text-red-300'>{errors.password}</p>}
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
                {isLoading ? 'Signing In...' : 'Sign In'}
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
                onClick={onSwitchToRegister}
              >
                <UserPlus className='size-4' />
                Create Account
              </Button>
            </form>
          </CardContent>

          <CardFooter className='justify-center text-xs text-white/60'>
            Tip: use your campus email so others can reach you.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}