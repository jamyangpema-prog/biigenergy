import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Download, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';

export function DownloadMenu({ url, filename, testid = 'download-menu' }) {
  const [busy, setBusy] = useState(false);
  const get = async (fmt) => {
    setBusy(true);
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await api.get(`${url}${sep}fmt=${fmt}`, { responseType: 'blob' });
      const href = URL.createObjectURL(res.data); const a = document.createElement('a');
      a.href = href; a.download = `${filename}.${fmt}`; a.click(); URL.revokeObjectURL(href);
    } catch { toast.error('Download failed'); } finally { setBusy(false); }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy} data-testid={testid}><Download className="h-4 w-4 mr-1" />{busy ? 'Preparing…' : 'Download'}<ChevronDown className="h-3.5 w-3.5 ml-1" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => get('pdf')} data-testid={`${testid}-pdf`}><FileText className="h-4 w-4 mr-2" />PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => get('xlsx')} data-testid={`${testid}-excel`}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel Sheet</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
