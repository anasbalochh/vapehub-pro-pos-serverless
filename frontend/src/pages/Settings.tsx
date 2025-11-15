import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Save, Building2, User, Mail, Upload, X, Image as ImageIcon } from "lucide-react";

const Settings = () => {
  const { user, updateBusinessName, updateLogo } = useAuth();
  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [logoUrl, setLogoUrl] = useState(user?.logoUrl || "");
  const [logoPreview, setLogoPreview] = useState(user?.logoUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.businessName) {
      setBusinessName(user.businessName);
    }
    if (user?.logoUrl) {
      setLogoUrl(user.logoUrl);
      setLogoPreview(user.logoUrl);
    }
  }, [user]);

  const handleSave = async () => {
    if (!businessName || businessName.trim().length === 0) {
      toast.error("Business name cannot be empty");
      return;
    }

    if (businessName.trim() === user?.businessName) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      if (updateBusinessName) {
        await updateBusinessName(businessName.trim());
        toast.success("Business name updated successfully!");
      } else {
        // Fallback: direct database update
        const { error } = await supabase
          .from('users')
          .update({ business_name: businessName.trim() })
          .eq('id', user?.id);

        if (error) throw error;
        toast.success("Business name updated successfully!");
        // Reload page to reflect changes
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error updating business name:', error);
      toast.error(error?.message || "Failed to update business name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload file
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // If bucket doesn't exist, try creating it or use public URL
        // For now, we'll use a data URL approach
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          // Store as data URL in database (alternative approach)
          if (updateLogo) {
            await updateLogo(base64Data);
            toast.success("Logo uploaded successfully!");
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      // Update logo URL in database
      if (updateLogo) {
        await updateLogo(publicUrl);
        setLogoUrl(publicUrl);
        toast.success("Logo uploaded successfully!");
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error?.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!updateLogo) return;

    try {
      await updateLogo('');
      setLogoUrl('');
      setLogoPreview('');
      toast.success("Logo removed successfully!");
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast.error(error?.message || "Failed to remove logo");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>
              Update your business or website name. This will appear throughout your POS system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business/Website Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
                disabled={isSaving || isLoading}
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                This name appears on your login page, navigation bar, and printed receipts.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading || !businessName.trim() || businessName.trim() === user?.businessName}
              className="mt-4"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Business Logo
            </CardTitle>
            <CardDescription>
              Upload your business logo. This will appear on your login page and navigation bar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Logo Preview */}
              {logoPreview ? (
                <div className="relative inline-block">
                  <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center p-2">
                    <img
                      src={logoPreview}
                      alt="Business Logo"
                      className="w-full h-full object-contain max-w-full max-h-full"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Upload Button */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    asChild
                    disabled={isUploadingLogo}
                    className="w-full sm:w-auto"
                  >
                    <span>
                      {isUploadingLogo ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {logoPreview ? 'Change Logo' : 'Upload Logo'}
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recommended: Square image, max 5MB. PNG, JPG, or SVG format.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account details (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={user?.username || ""}
                disabled
                className="max-w-md bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                value={user?.email || ""}
                disabled
                className="max-w-md bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={user?.role || ""}
                disabled
                className="max-w-md bg-muted"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

