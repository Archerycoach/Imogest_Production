import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Calculator, TrendingUp, Home, FileText, Download, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateMortgage,
  type FinancingParams,
} from "@/services/financingService";
import * as XLSX from "xlsx";

interface ExtraCosts {
  imt: number;
  stampDuty: number;
  deed: number;
  registry: number;
  total: number;
}

export default function FinancingPage() {
  const [params, setParams] = useState<FinancingParams>({
    propertyValue: 250000,
    downPayment: 50000,
    interestRate: 3.5,
    spread: 1.5,
    loanTermYears: 30,
  });

  const [imtPercentage, setImtPercentage] = useState<number>(6.5);
  const [stampDutyPercentage, setStampDutyPercentage] = useState<number>(0.8);
  const [deedValue, setDeedValue] = useState<number>(1500);
  const [registryValue, setRegistryValue] = useState<number>(300);
  const [showAdvancedCosts, setShowAdvancedCosts] = useState(false);

  const [result, setResult] = useState<ReturnType<typeof calculateMortgage> | null>(null);
  const [extraCosts, setExtraCosts] = useState<ExtraCosts | null>(null);

  const calculateCustomExtraCosts = (propertyValue: number): ExtraCosts => {
    const imt = (propertyValue * imtPercentage) / 100;
    const stampDuty = (propertyValue * stampDutyPercentage) / 100;
    const deed = deedValue;
    const registry = registryValue;
    const total = imt + stampDuty + deed + registry;

    return { imt, stampDuty, deed, registry, total };
  };

  const handleCalculate = () => {
    const mortgageResult = calculateMortgage(params);
    const costsResult = calculateCustomExtraCosts(params.propertyValue);
    setResult(mortgageResult);
    setExtraCosts(costsResult);
  };

  const handleExport = () => {
    if (!result || !extraCosts) return;

    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["SIMULAÇÃO DE FINANCIAMENTO HABITAÇÃO"],
      [""],
      ["DADOS DO IMÓVEL"],
      ["Valor do Imóvel", `€${params.propertyValue.toLocaleString()}`],
      ["Entrada", `€${params.downPayment.toLocaleString()}`],
      ["Montante a Financiar", `€${(params.propertyValue - params.downPayment).toLocaleString()}`],
      [""],
      ["CONDIÇÕES DO CRÉDITO"],
      ["Taxa Euribor", `${params.interestRate}%`],
      ["Spread do Banco", `${params.spread}%`],
      ["Taxa Total", `${(params.interestRate + params.spread).toFixed(2)}%`],
      ["Prazo", `${params.loanTermYears} anos (${params.loanTermYears * 12} meses)`],
      [""],
      ["RESUMO FINANCEIRO"],
      ["Prestação Mensal", `€${result.monthlyPayment.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
      ["Total a Pagar", `€${result.totalPayment.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
      ["Total de Juros", `€${result.totalInterest.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
      [""],
      ["CUSTOS ADICIONAIS"],
      ["IMT", `${imtPercentage}%`, `€${extraCosts.imt.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
      ["Imposto de Selo", `${stampDutyPercentage}%`, `€${extraCosts.stampDuty.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
      ["Escritura", "", `€${extraCosts.deed.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
      ["Registo Predial", "", `€${extraCosts.registry.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
      ["Total de Custos", "", `€${extraCosts.total.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
      [""],
      ["INVESTIMENTO TOTAL INICIAL"],
      ["Entrada + Custos", "", `€${(params.downPayment + extraCosts.total).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

    XLSX.writeFile(workbook, `Simulacao_Financiamento_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Layout title="Financiamento">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              💰 Calculadora de Financiamento
            </h1>
            <p className="text-gray-600">
              Simule o crédito habitação e calcule os custos associados
            </p>
          </div>
          {result && (
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Simulação
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Dados do Financiamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="propertyValue">Valor do Imóvel (€)</Label>
                <Input
                  id="propertyValue"
                  type="number"
                  value={params.propertyValue.toString()}
                  onChange={(e) =>
                    setParams({ ...params, propertyValue: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label htmlFor="downPayment">Entrada (€)</Label>
                <Input
                  id="downPayment"
                  type="number"
                  value={params.downPayment.toString()}
                  onChange={(e) =>
                    setParams({ ...params, downPayment: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {((params.downPayment / params.propertyValue) * 100).toFixed(1)}% do valor
                </p>
              </div>

              <div>
                <Label htmlFor="interestRate">Taxa Euribor (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  value={params.interestRate.toString()}
                  onChange={(e) =>
                    setParams({ ...params, interestRate: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Taxa Euribor atual (ex: 3.5%)
                </p>
              </div>

              <div>
                <Label htmlFor="spread">Spread do Banco (%)</Label>
                <Input
                  id="spread"
                  type="number"
                  step="0.1"
                  value={params.spread.toString()}
                  onChange={(e) =>
                    setParams({ ...params, spread: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Spread negociado com o banco (ex: 1.5%)
                </p>
              </div>

              <div>
                <Label htmlFor="loanTermYears">Prazo (anos)</Label>
                <Input
                  id="loanTermYears"
                  type="number"
                  value={params.loanTermYears.toString()}
                  onChange={(e) =>
                    setParams({ ...params, loanTermYears: Number(e.target.value) })
                  }
                />
              </div>

              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedCosts(!showAdvancedCosts)}
                  className="w-full mb-3"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdvancedCosts ? "Ocultar" : "Configurar"} Custos Adicionais
                </Button>

                {showAdvancedCosts && (
                  <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                    <div>
                      <Label htmlFor="imtPercentage" className="text-xs">
                        IMT (%)
                      </Label>
                      <Input
                        id="imtPercentage"
                        type="number"
                        step="0.1"
                        value={imtPercentage.toString()}
                        onChange={(e) => setImtPercentage(Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Calculado: {formatCurrency((params.propertyValue * imtPercentage) / 100)}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="stampDutyPercentage" className="text-xs">
                        Imposto de Selo (%)
                      </Label>
                      <Input
                        id="stampDutyPercentage"
                        type="number"
                        step="0.1"
                        value={stampDutyPercentage.toString()}
                        onChange={(e) => setStampDutyPercentage(Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Calculado: {formatCurrency((params.propertyValue * stampDutyPercentage) / 100)}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="deedValue" className="text-xs">
                        Escritura (€)
                      </Label>
                      <Input
                        id="deedValue"
                        type="number"
                        value={deedValue.toString()}
                        onChange={(e) => setDeedValue(Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="registryValue" className="text-xs">
                        Registo Predial (€)
                      </Label>
                      <Input
                        id="registryValue"
                        type="number"
                        value={registryValue.toString()}
                        onChange={(e) => setRegistryValue(Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs font-semibold text-gray-700">
                        Total Estimado: {formatCurrency(
                          (params.propertyValue * imtPercentage) / 100 +
                          (params.propertyValue * stampDutyPercentage) / 100 +
                          deedValue +
                          registryValue
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleCalculate} className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                Calcular
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resultados da Simulação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <Tabs defaultValue="summary">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="summary">Resumo</TabsTrigger>
                    <TabsTrigger value="costs">Custos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">
                          Prestação Mensal
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(result.monthlyPayment)}
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">
                          Total a Pagar
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(result.totalPayment)}
                        </p>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">
                          Total de Juros
                        </p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(result.totalInterest)}
                        </p>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">
                          Montante Financiado
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(
                            params.propertyValue - params.downPayment
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Resumo do Crédito</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Valor do Imóvel:</span>
                          <span className="font-medium">
                            {formatCurrency(params.propertyValue)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Entrada:</span>
                          <span className="font-medium">
                            {formatCurrency(params.downPayment)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Montante a Financiar:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              params.propertyValue - params.downPayment
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taxa de Juro:</span>
                          <span className="font-medium">
                            Euribor {params.interestRate}% + Spread {params.spread}% = {(params.interestRate + params.spread).toFixed(2)}% anual
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Prazo:</span>
                          <span className="font-medium">
                            {params.loanTermYears} anos ({params.loanTermYears * 12}{" "}
                            meses)
                          </span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="costs" className="space-y-4">
                    {extraCosts && (
                      <>
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <h4 className="font-semibold mb-3">
                            Custos Adicionais Configurados
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">IMT ({imtPercentage}%):</span>
                              <span className="font-medium">
                                {formatCurrency(extraCosts.imt)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Imposto de Selo ({stampDutyPercentage}%):</span>
                              <span className="font-medium">
                                {formatCurrency(extraCosts.stampDuty)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Escritura:</span>
                              <span className="font-medium">
                                {formatCurrency(extraCosts.deed)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Registo Predial:</span>
                              <span className="font-medium">
                                {formatCurrency(extraCosts.registry)}
                              </span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-bold">
                              <span>Total de Custos:</span>
                              <span className="text-red-600">
                                {formatCurrency(extraCosts.total)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold mb-2">
                            💡 Investimento Total Inicial
                          </h4>
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Entrada:</span>
                              <span>{formatCurrency(params.downPayment)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Custos:</span>
                              <span>{formatCurrency(extraCosts.total)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                              <span>Total Necessário:</span>
                              <span className="text-blue-600">
                                {formatCurrency(
                                  params.downPayment + extraCosts.total
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
                          <p className="mb-2">
                            <strong>Nota:</strong> Os valores configurados são personalizáveis e podem variar conforme:
                          </p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Localização do imóvel</li>
                            <li>
                              Tipo de habitação (própria permanente ou secundária)
                            </li>
                            <li>Banco e condições específicas</li>
                            <li>Seguros obrigatórios (vida e multirriscos)</li>
                            <li>Avaliação do imóvel</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Home className="h-16 w-16 mb-4" />
                  <p>Preencha os dados e clique em "Calcular"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos Necessários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-gray-600">
                <li>✓ Comprovativo de rendimentos</li>
                <li>✓ Declaração de IRS</li>
                <li>✓ Documentos de identificação</li>
                <li>✓ Comprovativos de outras dívidas</li>
                <li>✓ Caderneta predial do imóvel</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Dicas Úteis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-gray-600">
                <li>💡 Entrada mínima recomendada: 20%</li>
                <li>💡 Prestação máxima: 30-35% do rendimento</li>
                <li>💡 Compare taxas de vários bancos</li>
                <li>💡 Considere seguros no custo total</li>
                <li>💡 Negocie spread e comissões</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Home className="h-4 w-4" />
                Prazos Típicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-gray-600">
                <li>🏠 Habitação própria: 30-40 anos</li>
                <li>🏢 Habitação secundária: 25-30 anos</li>
                <li>💼 Investimento: 20-25 anos</li>
                <li>⚡ Pré-aprovação: 1-2 semanas</li>
                <li>📄 Aprovação final: 2-4 semanas</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}