import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash2, UserPlus } from 'lucide-react';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [show, setShow] = useState(false);
  const [n, setN] = useState({ email: '', name: '', password: '', role: 'estimator' });

  const load = () => api.get('/auth/users').then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const add = async () => {
    try { await api.post('/auth/register', n); setShow(false); setN({ email: '', name: '', password: '', role: 'estimator' }); load(); toast.success('User created'); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };
  const del = async (id) => { if (!window.confirm('Delete user?')) return; await api.delete(`/auth/users/${id}`); load(); };

  return (
    <div className="space-y-5 max-w-4xl" data-testid="users-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Users</h1>
             <p className="text-sm text-slate-500">Manage who can access the costing system.</p></div>
        <Button onClick={() => setShow(true)} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="btn-add-user"><UserPlus className="h-4 w-4 mr-2" /> Add user</Button>
      </div>
      <Card className="border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Role</th><th className="w-16"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-3 text-slate-700">{u.email}</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">{u.role}</span></td>
                <td className="px-4 py-3">{u.id !== me.id && <button onClick={() => del(u.id)} className="text-slate-400 hover:text-red-600" data-testid={`del-user-${u.email}`}><Trash2 className="h-4 w-4" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Dialog open={show} onOpenChange={setShow}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} data-testid="new-user-name" /></div>
            <div><Label>Email</Label><Input type="email" value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} data-testid="new-user-email" /></div>
            <div><Label>Password</Label><Input type="password" value={n.password} onChange={(e) => setN({ ...n, password: e.target.value })} data-testid="new-user-password" /></div>
            <div><Label>Role</Label>
              <Select value={n.role} onValueChange={(v) => setN({ ...n, role: v })}>
                <SelectTrigger data-testid="new-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="estimator">Estimator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShow(false)}>Cancel</Button><Button onClick={add} className="bg-slate-900 text-white" data-testid="btn-save-user">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
