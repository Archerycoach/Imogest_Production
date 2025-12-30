import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, CreditCard, AlertCircle, Loader2 } from "lucide-react";
import {
  getSubscriptionPlans,
  getUserSubscription,
  getPaymentHistory,
  type SubscriptionWithPlan,
} from "@/services/subscriptionService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { User } from "@supabase/supabase-js";
import { Layout } from "@/components/Layout";

type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"];

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("current");
  
  // Payment selector state
  const [isPaymentSelectorOpen, setIsPaymentSelectorOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      await loadData(session.user.id);
    };

    init();
  }, [router]);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      const [subData, plansData, historyData] = await Promise.all([
        getUserSubscription(userId),
        getSubscriptionPlans(),
        getPaymentHistory(userId),
      ]);

      setSubscription(subData);
      setPlans(plansData);
      setPaymentHistory(historyData);
      
      if (!subData) {
        setActiveTab("plans");
      }
    } catch (error) {
      console.error("Error loading subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsPaymentSelectorOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!subscription?.plan_id) return;
    const currentPlan = plans.find(p => p.id === subscription.plan_id);
    if (currentPlan) {
      setSelectedPlan(currentPlan);
      setIsPaymentSelectorOpen(true);
    }
  };

  const handlePaymentSuccess = async () => {
    setIsPaymentSelectorOpen(false);
    if (user) {
      await loadData(user.id);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-PT");
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      trialing: "bg-blue-100 text-blue-700",
      past_due: "bg-orange-100 text-orange-700",
      canceled: "bg-gray-100 text-gray-700",
      unpaid: "bg-red-100 text-red-700",
    };
    return (
      <Badge className={styles[status] || "bg-gray-100"}>
        {status === 'trialing' ? 'Em Teste' : status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">A Minha Subscrição</h1>
          <p className="text-gray-600">Gerir plano e método de pagamento</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="current">Plano Atual</TabsTrigger>
            <TabsTrigger value="plans">Mudar de Plano</TabsTrigger>
            <TabsTrigger value="history">Histórico de Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            {subscription ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">
                        {subscription.subscription_plans?.name}
                      </CardTitle>
                      <CardDescription>
                        {subscription.subscription_plans?.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(subscription.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Valor</p>
                      <p className="text-2xl font-bold">
                        €{subscription.subscription_plans?.price}
                        <span className="text-sm font-normal text-gray-500">
                          /{subscription.subscription_plans?.billing_interval === 'monthly' ? 'mês' : 'ano'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Renovação</p>
                      <p className="text-lg">
                        {formatDate(subscription.current_period_end)}
                      </p>
                    </div>
                  </div>

                  {subscription.status === 'trialing' && (
                    <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <p className="text-blue-700 text-sm">
                        O seu período de teste termina a {formatDate(subscription.trial_end!)}.
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button variant="outline" onClick={handleUpdatePayment}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Atualizar Método de Pagamento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500 mb-4">Não tem nenhuma subscrição ativa.</p>
                  <Button onClick={() => setActiveTab("plans")}>Ver Planos</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans">
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className={`flex flex-col ${subscription?.plan_id === plan.id ? 'border-blue-500 shadow-md' : ''}`}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">€{plan.price}</span>
                      <span className="text-gray-500">/{plan.billing_interval === 'monthly' ? 'mês' : 'ano'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-3 mb-6 flex-1">
                      {Array.isArray(plan.features) && plan.features.map((feature: string, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={subscription?.plan_id === plan.id ? "secondary" : "default"}
                      disabled={subscription?.plan_id === plan.id}
                      onClick={() => handleChoosePlan(plan)}
                    >
                      {subscription?.plan_id === plan.id ? "Plano Atual" : "Escolher Plano"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.created_at)}</TableCell>
                        <TableCell>€{payment.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paymentHistory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500">
                          Sem histórico de pagamentos.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedPlan && user && (
          <PaymentMethodSelector
            isOpen={isPaymentSelectorOpen}
            onClose={() => setIsPaymentSelectorOpen(false)}
            userId={user.id}
            planId={selectedPlan.id}
            planName={selectedPlan.name}
            planPrice={selectedPlan.price}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </Layout>
  );
}