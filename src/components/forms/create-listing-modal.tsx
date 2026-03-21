"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";

interface CreateListingModalProps {
  workspaces: { id: string; name: string }[];
}

export function CreateListingModal({ workspaces }: CreateListingModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Houston");
  const [state, setState] = useState("TX");
  const [zipCode, setZipCode] = useState("");
  const [price, setPrice] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sqft, setSqft] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [description, setDescription] = useState("");

  function resetForm() {
    setAddress("");
    setCity("Houston");
    setState("TX");
    setZipCode("");
    setPrice("");
    setPropertyType("");
    setBedrooms("");
    setBathrooms("");
    setSqft("");
    setWorkspaceId(workspaces[0]?.id ?? "");
    setDescription("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      setError("Address, city, state, and zip code are required");
      return;
    }
    if (!workspaceId) {
      setError("Please select a workspace");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await api("/listings", {
      method: "POST",
      body: JSON.stringify({
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        price: price ? Number(price) : undefined,
        propertyType: propertyType.trim() || undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        sqft: sqft ? Number(sqft) : undefined,
        workspaceId,
        description: description.trim() || undefined,
      }),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || "Failed to create listing");
      return;
    }

    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        Add Listing
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Listing</DialogTitle>
          <DialogDescription>
            Create a new property listing in your workspace
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lst-address">Address</Label>
            <Input
              id="lst-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lst-city">City</Label>
              <Input
                id="lst-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lst-state">State</Label>
              <Input
                id="lst-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lst-zip">Zip Code</Label>
              <Input
                id="lst-zip"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="77002"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lst-price">Price</Label>
              <Input
                id="lst-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="450000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lst-type">Property Type</Label>
              <Input
                id="lst-type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                placeholder="Single Family"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lst-beds">Bedrooms</Label>
              <Input
                id="lst-beds"
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lst-baths">Bathrooms</Label>
              <Input
                id="lst-baths"
                type="number"
                step="0.5"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                placeholder="2.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lst-sqft">Sqft</Label>
              <Input
                id="lst-sqft"
                type="number"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="2400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Workspace</Label>
            <Select value={workspaceId} onValueChange={(v) => setWorkspaceId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lst-desc">Description</Label>
            <Textarea
              id="lst-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Listing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
