import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { industriesApi, userIndustryApi } from '@/lib/multi-industry-api';
import type { Industry } from '@/types/multi-industry';
import { ArrowRight, Check } from "lucide-react";
import React, { useState } from 'react';
import { toast } from "sonner";

interface IndustrySelectionProps {
  userId: string;
  onIndustrySelected: (industry: Industry) => void;
  onSkip?: () => void;
}

export const IndustrySelection: React.FC<IndustrySelectionProps> = ({
  userId,
  onIndustrySelected,
  onSkip
}) => {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load industries on mount
  React.useEffect(() => {
    loadIndustries();
  }, []);

  const loadIndustries = async () => {
    try {
      setIsLoading(true);
      const response = await industriesApi.list();
      setIndustries(response.data);
    } catch (error) {
      console.error('Failed to load industries:', error);
      // Fallback to default industries if database is not set up
      const defaultIndustries: Industry[] = [
        {
          id: 'vape-shop',
          name: 'vape_shop',
          displayName: 'Vape Shop',
          description: 'E-liquids, devices, and accessories',
          color: '#8B5CF6',
          icon: '💨',
          defaultFields: [
            { fieldKey: 'nicotine_strength', fieldLabel: 'Nicotine Strength', fieldType: 'text', isRequired: true },
            { fieldKey: 'flavor_profile', fieldLabel: 'Flavor Profile', fieldType: 'text', isRequired: false },
            { fieldKey: 'device_compatibility', fieldLabel: 'Device Compatibility', fieldType: 'text', isRequired: false }
          ],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'pharmacy',
          name: 'pharmacy',
          displayName: 'Pharmacy',
          description: 'Medications, health products, and prescriptions',
          color: '#10B981',
          icon: '💊',
          defaultFields: [
            { fieldKey: 'prescription_required', fieldLabel: 'Prescription Required', fieldType: 'boolean', isRequired: true },
            { fieldKey: 'dosage', fieldLabel: 'Dosage', fieldType: 'text', isRequired: true },
            { fieldKey: 'expiration_date', fieldLabel: 'Expiration Date', fieldType: 'date', isRequired: true }
          ],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'grocery-store',
          name: 'grocery_store',
          displayName: 'Grocery Store',
          description: 'Food items, beverages, and household products',
          color: '#F59E0B',
          icon: '🛒',
          defaultFields: [
            { fieldKey: 'nutritional_info', fieldLabel: 'Nutritional Information', fieldType: 'text', isRequired: false },
            { fieldKey: 'allergens', fieldLabel: 'Allergens', fieldType: 'text', isRequired: false },
            { fieldKey: 'organic_certified', fieldLabel: 'Organic Certified', fieldType: 'boolean', isRequired: false }
          ],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'electronics',
          name: 'electronics',
          displayName: 'Electronics Store',
          description: 'Electronic devices, accessories, and gadgets',
          color: '#3B82F6',
          icon: '📱',
          defaultFields: [
            { fieldKey: 'warranty_period', fieldLabel: 'Warranty Period', fieldType: 'text', isRequired: true },
            { fieldKey: 'model_number', fieldLabel: 'Model Number', fieldType: 'text', isRequired: true },
            { fieldKey: 'compatibility', fieldLabel: 'Compatibility', fieldType: 'text', isRequired: false }
          ],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setIndustries(defaultIndustries);
      toast.info('Using default industry templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndustrySelect = (industry: Industry) => {
    setSelectedIndustry(industry);
  };

  const handleContinue = async () => {
    if (!selectedIndustry) {
      toast.error('Please select an industry');
      return;
    }

    if (!businessName.trim()) {
      toast.error('Please enter your business name');
      return;
    }

    try {
      setIsSubmitting(true);
      await userIndustryApi.set(userId, selectedIndustry.id, businessName.trim());
      toast.success('Business type set successfully');
      onIndustrySelected(selectedIndustry);
    } catch (error) {
      console.error('Failed to set industry:', error);
      toast.error('Failed to set business type');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading industries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Multi-Industry POS</h1>
        <p className="text-xl text-muted-foreground">
          Choose your business type to get started with customized product fields
        </p>
      </div>

      {/* Business Name Input */}
      {selectedIndustry && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: selectedIndustry.color }}
              >
                {selectedIndustry.displayName?.charAt(0) || '?'}
              </div>
              {selectedIndustry.displayName} Setup
            </CardTitle>
            <CardDescription>
              Enter your business name to complete the setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
                className="w-full px-3 py-2 border border-border rounded-md bg-secondary text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleContinue} disabled={isSubmitting}>
                {isSubmitting ? 'Setting up...' : 'Continue'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => setSelectedIndustry(null)}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Selection */}
      {!selectedIndustry && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((industry) => (
            <Card
              key={industry.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${selectedIndustry?.id === industry.id ? 'ring-2 ring-primary' : ''
                }`}
              onClick={() => handleIndustrySelect(industry)}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: industry.color }}
                  >
                    {industry.displayName?.charAt(0) || '?'}
                  </div>
                </div>
                <CardTitle className="text-xl">{industry.displayName}</CardTitle>
                <CardDescription className="text-sm">
                  {industry.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Default Fields Preview */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Default Fields:</h4>
                  <div className="flex flex-wrap gap-1">
                    {industry.defaultFields.slice(0, 4).map((field) => (
                      <Badge key={field.key} variant="secondary" className="text-xs">
                        {field.label}
                      </Badge>
                    ))}
                    {industry.defaultFields.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{industry.defaultFields.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Default Categories Preview */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Categories:</h4>
                  <div className="flex flex-wrap gap-1">
                    {industry.defaultCategories.slice(0, 3).map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                    {industry.defaultCategories.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{industry.defaultCategories.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIndustrySelect(industry);
                  }}
                >
                  Select {industry.displayName}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Skip Option */}
      {onSkip && (
        <div className="text-center">
          <Button variant="ghost" onClick={onSkip}>
            Skip for now
          </Button>
        </div>
      )}

      {/* Features */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-center">Why Choose Multi-Industry POS?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">Customizable Fields</h3>
              <p className="text-sm text-muted-foreground">
                Rename and customize product fields to match your business needs
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">Industry Templates</h3>
              <p className="text-sm text-muted-foreground">
                Pre-configured templates for different business types
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">Easy Migration</h3>
              <p className="text-sm text-muted-foreground">
                Switch between industries or customize as your business grows
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
