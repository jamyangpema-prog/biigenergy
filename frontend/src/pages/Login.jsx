import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const LOGO = 'https://customer-assets-jt897jd0.emergentagent.net/job_equipquote--13ttmu53/artifacts/57e4a1b4741c1c06_LOGO%20BE.png';
const BG = 'https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwZW5naW5lZXJpbmclMjBtYW51ZmFjdHVyaW5nJTIwZmFjaWxpdHklMjBjbGVhbnxlbnwwfHx8fDE3OTM1OTI1MDB8MA&ixlib=rb-4.1.0&q=85';

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
      nav('/app');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={BG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-900/80" />
        <div className="relative z-10 flex flex-col justify-between h-full p-10 text-white">
          <div className="flex items-center gap-3">
            <img src={LOGO} className="h-12 w-12 rounded-md object-cover" alt="BIIG ENERGY" />
            <div>
              <div className="text-xl font-semibold">BIIG ENERGY</div>
              <div className="text-xs text-slate-300 uppercase tracking-wider">Equipment Costing System</div>
            </div>
          </div>
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold mb-3">Centralised equipment costing & quotations.</h1>
            <p className="text-slate-300">Live calculations, multiple projects, Excel in/out, and PDF quotes — purpose-built for Australian engineering & electrical manufacturing.</p>
          </div>
          <div className="text-xs text-slate-400">© {new Date().getFullYear()} BIIG Energy · All prices in AUD</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-slate-50">
        <Card className="w-full max-w-md p-8 border-slate-200">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <img src={LOGO} className="h-10 w-10 rounded object-cover" alt="BIIG ENERGY" />
            <div className="font-semibold text-slate-900">BIIG ENERGY</div>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Use your BIIG Energy credentials.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     data-testid="login-email" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                     data-testid="login-password" required autoComplete="current-password" />
            </div>
            <Button type="submit" disabled={loading} data-testid="login-submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
