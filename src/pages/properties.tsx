import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { PropertiesList } from "@/components/properties/PropertiesList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getProperties } from "@/services/propertiesService";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@/types";

export default function PropertiesPage() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const fetchProperties = async () => {
    try {
      const data = await getProperties();
      setProperties(data as unknown as Property[]);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os imóveis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchProperties();
    setIsFormOpen(false);
    setEditingProperty(null);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditingProperty(null);
  };

  return (
    <Layout title="Gestão de Imóveis">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seu portfólio de propriedades.
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Imóvel
          </Button>
        </div>

        <PropertiesList
          properties={properties}
          onEdit={handleEdit}
          onRefresh={fetchProperties}
        />

        <PropertyForm
          property={editingProperty}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      </div>
    </Layout>
  );
}