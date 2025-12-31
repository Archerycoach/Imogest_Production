import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, Loader2 } from "lucide-react";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadsList } from "@/components/leads/LeadsList";
import {
  getAllLeads,
  deleteLead,
  type LeadWithContacts,
} from "@/services/leadsService";
import { getCurrentUser } from "@/services/authService";
import { Layout } from "@/components/Layout";
import {
  parseExcelFile,
  importLeads,
  generateLeadsTemplate,
  type ImportResult,
} from "@/services/importService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Leads() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<LeadWithContacts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithContacts | null>(null);
  
  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/login");
    }
  };

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const data = await getAllLeads();
      setLeads(data);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar este lead?")) return;

    try {
      await deleteLead(id);
      await loadLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Erro ao eliminar lead. Tente novamente.");
    }
  };

  const handleEdit = (lead: LeadWithContacts) => {
    setEditingLead(lead);
    setShowForm(true);
  };

  const handleDownloadTemplate = () => {
    generateLeadsTemplate();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportResult(null);

      // Parse Excel file
      const data = await parseExcelFile(file);
      
      if (data.length === 0) {
        alert("O ficheiro está vazio ou não contém dados válidos.");
        return;
      }

      // Import leads
      const result = await importLeads(data);
      setImportResult(result);

      // Reload leads if any were imported successfully
      if (result.success > 0) {
        await loadLeads();
      }

      // Show results
      setShowImportDialog(true);
    } catch (error: any) {
      console.error("Import error:", error);
      alert(`Erro ao importar ficheiro: ${error.message}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">A verificar autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout title="Leads">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
              <p className="text-gray-600 mt-1">Gerir potenciais clientes</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                <Download className="h-5 w-5 mr-2" />
                Template Excel
              </Button>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    A Importar...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Importar Excel
                  </>
                )}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button 
                onClick={() => setShowForm(true)} 
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nova Lead
              </Button>
            </div>
          </div>

          {showForm && (
            <LeadForm
              initialData={editingLead || undefined}
              onSuccess={async () => {
                setShowForm(false);
                setEditingLead(null);
                await loadLeads();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingLead(null);
              }}
            />
          )}

          {!showForm && (
            <LeadsList
              leads={leads}
              onEdit={handleEdit}
              onDelete={handleDeleteLead}
              isLoading={isLoading}
              onConvertSuccess={loadLeads}
            />
          )}
        </div>
      </div>

      {/* Import Results Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Importação</DialogTitle>
            <DialogDescription>
              Resumo da importação de leads
            </DialogDescription>
          </DialogHeader>

          {importResult && (
            <div className="space-y-4">
              {/* Success Summary */}
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  ✅ <strong>{importResult.success}</strong> de <strong>{importResult.total || 0}</strong> leads importadas com sucesso
                </AlertDescription>
              </Alert>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-600 mb-2">
                    ⚠️ {importResult.errors.length} erros encontrados:
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importResult.errors.map((error, idx) => (
                      <Alert key={idx} className="border-red-200 bg-red-50">
                        <AlertDescription className="text-sm text-red-800">
                          <strong>Linha {error.row}:</strong> {error.error}
                          {error.data && (
                            <div className="mt-1 text-xs text-red-600">
                              Dados: {JSON.stringify(error.data, null, 2)}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  onClick={() => setShowImportDialog(false)}
                  variant="outline"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}