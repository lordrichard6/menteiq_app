'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  FolderKanban,
  DollarSign,
  Download,
  LogOut,
  Clock,
} from 'lucide-react';
import { PortalSession } from '@/lib/portal/session';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface PortalDashboardClientProps {
  session: PortalSession;
  invoices: any[];
  documents: any[];
  projects: any[];
}

export function PortalDashboardClient({
  session,
  invoices,
  documents,
  projects,
}: PortalDashboardClientProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/portal/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/portal/invoices/${invoiceId}/download`);

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/portal/documents/${documentId}/download`);

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'on_hold':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Calculate stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const activeProjects = projects.filter((p) => p.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back, {session.contact_name.split(' ')[0]}
            </h1>
            <p className="text-slate-600 mt-1">
              Here's an overview of your account
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-slate-300"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Invoiced
                </CardTitle>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                CHF {totalInvoiced.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Active Projects
                </CardTitle>
                <FolderKanban className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {activeProjects}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {projects.length} project{projects.length !== 1 ? 's' : ''} total
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Documents
                </CardTitle>
                <FileText className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {documents.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Shared with you</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invoices */}
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-slate-500">No invoices yet.</p>
              ) : (
                <div className="space-y-3">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                          </p>
                          <Badge className={getInvoiceStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {format(new Date(invoice.created_at), 'dd MMM yyyy')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-sm font-semibold text-slate-900">
                          CHF {invoice.total?.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number || invoice.id.slice(0, 8))}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Shared Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No documents shared with you yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {documents.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(doc.created_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadDocument(doc.id, doc.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects */}
        {projects.length > 0 && (
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Your Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-white"
                  >
                    {/* Project Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg text-slate-900">
                            {project.name}
                          </h3>
                          <Badge className={getProjectStatusColor(project.status)}>
                            {project.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Project Timeline */}
                    {(project.start_date || project.end_date) && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                        {project.start_date && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              Started: {format(new Date(project.start_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        )}
                        {project.end_date && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              {project.status === 'completed' ? 'Completed' : 'Due'}: {format(new Date(project.end_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Project Progress (if available) */}
                    {project.progress !== undefined && project.progress !== null && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">
                            Progress
                          </span>
                          <span className="text-xs font-semibold text-slate-900">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
