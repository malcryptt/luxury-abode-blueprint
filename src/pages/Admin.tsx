import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, X, Trash2, UserPlus } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useNoIndex } from "@/components/site/Seo";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Property {
  id: string;
  image: string;
  title: string;
  location: string;
  description: string;
  price: string;
}

interface Furniture {
  id: string;
  images: string[];
  title: string;
  location: string;
  description: string;
  price: string;
}

interface Service {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface WebsiteContent {
  hero: {
    title: string;
    subtitle: string;
  };
  about: {
    title: string;
    description: string;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
    whatsapp: string;
  };
  properties: Property[];
  services: Service[];
  furniture: Furniture[];
}

const Admin = () => {
  useNoIndex("Admin");
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<WebsiteContent>({
    hero: { title: "", subtitle: "" },
    about: { title: "", description: "" },
    contact: { phone: "", email: "", address: "", whatsapp: "" },
    properties: [],
    services: [],
    furniture: [],
  });
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; user_id: string; email: string }>>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadContent();
      await loadAdminUsers();
      setLoading(false);
    };

    checkAdminAccess();
  }, [navigate]);

  const loadContent = async () => {
    const { data, error } = await supabase
      .from("website_content")
      .select("section, content");

    if (error) {
      toast.error("Failed to load content");
      return;
    }

    const contentMap: any = {
      hero: { title: "", subtitle: "" },
      about: { title: "", description: "" },
      contact: { phone: "", email: "", address: "", whatsapp: "" },
      properties: [],
      services: [],
      furniture: [],
    };
    
    data?.forEach((item) => {
      contentMap[item.section] = item.content;
    });

    setContent(contentMap);
  };

  const loadAdminUsers = async () => {
    const { data, error } = await supabase.functions.invoke("manage-admins", { body: { action: "list" } });
    if (error || data?.error) {
      toast.error("Failed to load admin users");
      return;
    }
    setAdminUsers(data.admins);
    setMyUserId(data.me);
  };

  const handleAddAdmin = async () => {
    const email = newAdminEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    if (newAdminPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setAddingAdmin(true);
    const { data, error } = await supabase.functions.invoke("manage-admins", {
      body: { action: "add", email, password: newAdminPassword },
    });
    setAddingAdmin(false);
    if (error || data?.error) {
      toast.error(data?.error ?? "Failed to add admin");
      return;
    }
    toast.success(`${email} is now an admin`);
    setNewAdminEmail("");
    setNewAdminPassword("");
    await loadAdminUsers();
  };

  const handleRemoveAdmin = async () => {
    if (!pendingRemove) return;
    const { id, email } = pendingRemove;
    setPendingRemove(null);
    const { data, error } = await supabase.functions.invoke("manage-admins", {
      body: { action: "remove", roleId: id },
    });
    if (error || data?.error) {
      toast.error(data?.error ?? "Failed to remove admin");
      return;
    }
    toast.success(`Admin access removed from ${email}`);
    await loadAdminUsers();
  };

  const handleSave = async (section: keyof WebsiteContent) => {
    const { error } = await supabase
      .from("website_content")
      .update({ content: content[section] as any })
      .eq("section", section);

    if (error) {
      toast.error(`Failed to save ${section} content`);
      return;
    }

    toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} content updated!`);
  };

  const handleImageUpload = async (file: File, propertyIndex: number) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) {
        toast.error("Failed to upload image");
        return;
      }

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      const newProperties = [...content.properties];
      newProperties[propertyIndex].image = data.publicUrl;
      setContent({ ...content, properties: newProperties });

      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error("Error uploading image");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
                className="border-gold text-gold hover:bg-gold hover:text-charcoal"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Site
              </Button>
              <h1 className="text-xl sm:text-2xl font-playfair font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Admin Management Section */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Management</CardTitle>
            <CardDescription>Add or remove admin users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="Admin email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="bg-secondary border-border flex-1"
              />
              <Input
                type="password"
                placeholder="Password (min 8 characters)"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                autoComplete="new-password"
                className="bg-secondary border-border flex-1"
              />
              <Button
                onClick={handleAddAdmin}
                disabled={addingAdmin}
                className="bg-gold hover:bg-gold-light text-charcoal whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {addingAdmin ? "Adding..." : "Add Admin"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Passwords are stored securely (hashed) and can't be viewed after adding.
            </p>

            <div className="border border-border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="text-xs sm:text-sm break-all">{admin.email}</TableCell>
                      <TableCell className="text-muted-foreground tracking-widest">••••••••</TableCell>
                      <TableCell className="text-right">
                        {admin.user_id !== myUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingRemove({ id: admin.id, email: admin.email })}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <AlertDialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this admin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {pendingRemove?.email} will no longer be able to edit the website.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemoveAdmin}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Hero Section Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
            <CardDescription>Edit the main hero section content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={content.hero.title}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, title: e.target.value },
                  })
                }
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subtitle</label>
              <Textarea
                value={content.hero.subtitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    hero: { ...content.hero, subtitle: e.target.value },
                  })
                }
                className="bg-secondary border-border"
                rows={3}
              />
            </div>
            <Button
              onClick={() => handleSave("hero")}
              className="bg-gold hover:bg-gold-light text-charcoal"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Hero Section
            </Button>
          </CardContent>
        </Card>

        {/* About Section Editor */}
        <Card>
          <CardHeader>
            <CardTitle>About Section</CardTitle>
            <CardDescription>Edit the about section content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={content.about.title}
                onChange={(e) =>
                  setContent({
                    ...content,
                    about: { ...content.about, title: e.target.value },
                  })
                }
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={content.about.description}
                onChange={(e) =>
                  setContent({
                    ...content,
                    about: { ...content.about, description: e.target.value },
                  })
                }
                className="bg-secondary border-border"
                rows={6}
              />
            </div>
            <Button
              onClick={() => handleSave("about")}
              className="bg-gold hover:bg-gold-light text-charcoal"
            >
              <Save className="w-4 h-4 mr-2" />
              Save About Section
            </Button>
          </CardContent>
        </Card>

        {/* Contact Section Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Edit contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input
                value={content.contact.phone}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, phone: e.target.value },
                  })
                }
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                value={content.contact.email}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, email: e.target.value },
                  })
                }
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">WhatsApp Number (with country code)</label>
              <Input
                value={content.contact.whatsapp}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, whatsapp: e.target.value },
                  })
                }
                placeholder="2348028081047"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Address</label>
              <Textarea
                value={content.contact.address}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, address: e.target.value },
                  })
                }
                className="bg-secondary border-border"
                rows={3}
              />
            </div>
            <Button
              onClick={() => handleSave("contact")}
              className="bg-gold hover:bg-gold-light text-charcoal"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Contact Information
            </Button>
          </CardContent>
        </Card>

        {/* Properties Section Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Featured Properties</CardTitle>
            <CardDescription>Edit featured properties (images, titles, locations, descriptions, prices)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {content.properties.map((property, index) => (
              <div key={property.id} className="p-4 border border-border rounded-lg space-y-4">
                <h4 className="font-semibold">Property {index + 1}</h4>
                <div>
                  <label className="text-sm font-medium mb-2 block">Property Image</label>
                  {property.image && (
                    <div className="relative w-full h-48 mb-2 rounded-lg overflow-hidden">
                      <img 
                        src={property.image} 
                        alt={property.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, index);
                      }}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Or enter image URL below:</p>
                  <Input
                    value={property.image}
                    onChange={(e) => {
                      const newProperties = [...content.properties];
                      newProperties[index].image = e.target.value;
                      setContent({ ...content, properties: newProperties });
                    }}
                    className="bg-secondary border-border mt-1"
                    placeholder="https://... or /src/assets/..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    value={property.title}
                    onChange={(e) => {
                      const newProperties = [...content.properties];
                      newProperties[index].title = e.target.value;
                      setContent({ ...content, properties: newProperties });
                    }}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Input
                    value={property.location}
                    onChange={(e) => {
                      const newProperties = [...content.properties];
                      newProperties[index].location = e.target.value;
                      setContent({ ...content, properties: newProperties });
                    }}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={property.description}
                    onChange={(e) => {
                      const newProperties = [...content.properties];
                      newProperties[index].description = e.target.value;
                      setContent({ ...content, properties: newProperties });
                    }}
                    className="bg-secondary border-border"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Price</label>
                  <Input
                    value={property.price}
                    onChange={(e) => {
                      const newProperties = [...content.properties];
                      newProperties[index].price = e.target.value;
                      setContent({ ...content, properties: newProperties });
                    }}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
            ))}
            <Button
              onClick={() => handleSave("properties")}
              className="bg-gold hover:bg-gold-light text-charcoal"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Properties
            </Button>
          </CardContent>
        </Card>

        {/* Services Section Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Our Expertise Services</CardTitle>
            <CardDescription>Edit the services displayed in Our Expertise section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {content.services.map((service, index) => (
              <div key={service.id} className="p-4 border border-border rounded-lg space-y-4">
                <h4 className="font-semibold">Service {index + 1}</h4>
                <div>
                  <label className="text-sm font-medium mb-2 block">Icon (lucide-react name)</label>
                  <Input
                    value={service.icon}
                    onChange={(e) => {
                      const newServices = [...content.services];
                      newServices[index].icon = e.target.value;
                      setContent({ ...content, services: newServices });
                    }}
                    className="bg-secondary border-border"
                    placeholder="Home, Building, Key, etc."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    value={service.title}
                    onChange={(e) => {
                      const newServices = [...content.services];
                      newServices[index].title = e.target.value;
                      setContent({ ...content, services: newServices });
                    }}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={service.description}
                    onChange={(e) => {
                      const newServices = [...content.services];
                      newServices[index].description = e.target.value;
                      setContent({ ...content, services: newServices });
                    }}
                    className="bg-secondary border-border"
                    rows={2}
                  />
                </div>
              </div>
            ))}
            <Button
              onClick={() => handleSave("services")}
              className="bg-gold hover:bg-gold-light text-charcoal"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Services
            </Button>
          </CardContent>
        </Card>

        {/* Furniture Section Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Luxury Furniture</CardTitle>
            <CardDescription>Edit featured furniture items (images, titles, locations, descriptions, prices)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {content.furniture && content.furniture.length > 0 ? (
              content.furniture.map((item, index) => (
              <div key={item.id} className="p-4 border border-border rounded-lg space-y-4">
                <h4 className="font-semibold">Furniture Item {index + 1}</h4>
                <div>
                  <label className="text-sm font-medium mb-2 block">Furniture Images</label>
                  {item.images && item.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                      {item.images.map((image, imageIndex) => (
                        <div key={imageIndex} className="relative w-full h-32 rounded-lg overflow-hidden group">
                          <img 
                            src={image} 
                            alt={`${item.title} - ${imageIndex + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => {
                              const newFurniture = [...content.furniture];
                              newFurniture[index].images = newFurniture[index].images.filter((_, i) => i !== imageIndex);
                              setContent({ ...content, furniture: newFurniture });
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files) {
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `${Math.random()}.${fileExt}`;
                              const filePath = `${fileName}`;

                              const { error: uploadError } = await supabase.storage
                                .from('property-images')
                                .upload(filePath, file);

                              if (uploadError) {
                                toast.error("Failed to upload image");
                                continue;
                              }

                              const { data } = supabase.storage
                                .from('property-images')
                                .getPublicUrl(filePath);

                              const newFurniture = [...content.furniture];
                              if (!newFurniture[index].images) {
                                newFurniture[index].images = [];
                              }
                              newFurniture[index].images.push(data.publicUrl);
                              setContent({ ...content, furniture: newFurniture });

                              toast.success("Image uploaded successfully!");
                            } catch (error) {
                              toast.error("Error uploading image");
                            }
                          }
                        }
                      }}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Select multiple images to upload</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    value={item.title}
                    onChange={(e) => {
                      const newFurniture = [...content.furniture];
                      newFurniture[index].title = e.target.value;
                      setContent({ ...content, furniture: newFurniture });
                    }}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Input
                    value={item.location}
                    onChange={(e) => {
                      const newFurniture = [...content.furniture];
                      newFurniture[index].location = e.target.value;
                      setContent({ ...content, furniture: newFurniture });
                    }}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => {
                      const newFurniture = [...content.furniture];
                      newFurniture[index].description = e.target.value;
                      setContent({ ...content, furniture: newFurniture });
                    }}
                    className="bg-secondary border-border"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Price</label>
                  <Input
                    value={item.price}
                    onChange={(e) => {
                      const newFurniture = [...content.furniture];
                      newFurniture[index].price = e.target.value;
                      setContent({ ...content, furniture: newFurniture });
                    }}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
            ))
            ) : (
              <div className="text-center p-8 border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground mb-4">No furniture items yet. Add your first item!</p>
                <Button
                  onClick={() => {
                    setContent({
                      ...content,
                      furniture: [
                        {
                          id: "1",
                          images: [],
                          title: "",
                          location: "",
                          description: "",
                          price: ""
                        }
                      ]
                    });
                  }}
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold hover:text-charcoal"
                >
                  Add Furniture Item
                </Button>
              </div>
            )}
            
            {content.furniture && content.furniture.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const newItem = {
                      id: `${Date.now()}`,
                      images: [],
                      title: "",
                      location: "",
                      description: "",
                      price: ""
                    };
                    setContent({
                      ...content,
                      furniture: [...content.furniture, newItem]
                    });
                  }}
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold hover:text-charcoal"
                >
                  Add Another Item
                </Button>
                <Button
                  onClick={() => handleSave("furniture")}
                  className="bg-gold hover:bg-gold-light text-charcoal"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Furniture
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
