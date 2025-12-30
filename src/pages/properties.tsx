import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Home, MapPin, Bed, Bath, Square, Euro, Filter } from "lucide-react";
import { 
  getProperties, 
  createProperty, 
  updateProperty, 
  deleteProperty,
  type PropertyWithDetails 
} from "@/services/propertiesService";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithDetails | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "apartment",
    status: "available",
    price: "",
    address: "",
    city: "",
    bedrooms: "",
    bathrooms: "",
    area: "",
    features: [] as string[],
    images: [] as string[]
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await getProperties();
      setProperties(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os imóveis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Erro", description: "Utilizador não autenticado", variant: "destructive" });
      return;
    }

    try {
      const propertyData = {
        title: formData.title,
        description: formData.description,
        property_type: formData.type as any,
        status: formData.status as any,
        price: Number(formData.price),
        address: formData.address,
        city: formData.city,
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        area: Number(formData.area),
        features: formData.features,
        images: formData.images,
        user_id: user.id
      };

      if (editingProperty) {
        await updateProperty(editingProperty.id, propertyData);
        toast({ title: "Sucesso", description: "Imóvel atualizado com sucesso" });
      } else {
        await createProperty(propertyData);
        toast({ title: "Sucesso", description: "Imóvel criado com sucesso" });
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadProperties();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao guardar imóvel",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja eliminar este imóvel?")) return;
    try {
      await deleteProperty(id);
      setProperties(properties.filter(p => p.id !== id));
      toast({ title: "Sucesso", description: "Imóvel eliminado" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao eliminar imóvel", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "apartment",
      status: "available",
      price: "",
      address: "",
      city: "",
      bedrooms: "",
      bathrooms: "",
      area: "",
      features: [],
      images: []
    });
    setEditingProperty(null);
  };

  const handleEdit = (property: PropertyWithDetails) => {
    setEditingProperty(property);
    setFormData({
      title: property.title,
      description: property.description || "",
      type: property.property_type,
      status: property.status,
      price: property.price.toString(),
      address: property.address || "",
      city: property.city || "",
      bedrooms: property.bedrooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      area: property.area?.toString() || "",
      features: (property.features as string[]) || [],
      images: property.images || []
    });
    setIsDialogOpen(true);
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || p.property_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Imóveis</h1>
              <p className="text-slate-500 mt-1">Gerir carteira de propriedades</p>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Imóvel
            </Button>
          </div>

          <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                className="pl-10"
                placeholder="Pesquisar por título, cidade..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Imóvel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="house">Moradia</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Sem imóveis</h3>
              <p className="text-slate-500">Comece por adicionar o seu primeiro imóvel.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-slate-100 relative">
                    {property.images && property.images[0] ? (
                      <img 
                        src={property.images[0]} 
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <Home className="h-12 w-12" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-white/90 text-slate-900 hover:bg-white">
                      {property.status === 'available' ? 'Disponível' : 
                       property.status === 'reserved' ? 'Reservado' : 
                       property.status === 'sold' ? 'Vendido' : 'Indisponível'}
                    </Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {property.property_type === 'apartment' ? 'Apartamento' :
                           property.property_type === 'house' ? 'Moradia' :
                           property.property_type === 'land' ? 'Terreno' : 'Comercial'}
                        </Badge>
                        <CardTitle className="text-xl line-clamp-1">{property.title}</CardTitle>
                      </div>
                      <p className="font-bold text-lg text-primary">
                        {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(property.price)}
                      </p>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {property.city}, {property.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 py-4 border-t border-b mb-4">
                      <div className="flex flex-col items-center justify-center text-center p-2 bg-slate-50 rounded">
                        <Bed className="h-4 w-4 text-slate-500 mb-1" />
                        <span className="text-sm font-medium">{property.bedrooms || 0}</span>
                        <span className="text-xs text-slate-400">Quartos</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-2 bg-slate-50 rounded">
                        <Bath className="h-4 w-4 text-slate-500 mb-1" />
                        <span className="text-sm font-medium">{property.bathrooms || 0}</span>
                        <span className="text-xs text-slate-400">WC</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-2 bg-slate-50 rounded">
                        <Square className="h-4 w-4 text-slate-500 mb-1" />
                        <span className="text-sm font-medium">{property.area || 0}</span>
                        <span className="text-xs text-slate-400">m²</span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(property)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(property.id)}>Eliminar</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProperty ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
                <DialogDescription>Preencha os detalhes do imóvel abaixo.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProperty} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Título</Label>
                    <Input 
                      required 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Ex: Apartamento T3 com vista mar"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={value => setFormData({...formData, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Apartamento</SelectItem>
                        <SelectItem value="house">Moradia</SelectItem>
                        <SelectItem value="land">Terreno</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Preço (€)</Label>
                    <Input 
                      required 
                      type="number" 
                      value={formData.price} 
                      onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input 
                      required 
                      value={formData.city} 
                      onChange={e => setFormData({...formData, city: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Morada</Label>
                    <Input 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quartos</Label>
                    <Input 
                      type="number" 
                      value={formData.bedrooms} 
                      onChange={e => setFormData({...formData, bedrooms: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Casas de Banho</Label>
                    <Input 
                      type="number" 
                      value={formData.bathrooms} 
                      onChange={e => setFormData({...formData, bathrooms: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Área (m²)</Label>
                    <Input 
                      type="number" 
                      value={formData.area} 
                      onChange={e => setFormData({...formData, area: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={value => setFormData({...formData, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Disponível</SelectItem>
                        <SelectItem value="reserved">Reservado</SelectItem>
                        <SelectItem value="sold">Vendido</SelectItem>
                        <SelectItem value="rented">Arrendado</SelectItem>
                        <SelectItem value="off_market">Retirado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Descrição</Label>
                    <Textarea 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Guardar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}