"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Filter, MoreVertical, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { partnersApi, type Partner, type PartnerDetails as ApiPartnerDetails } from "@/lib/api/partners"
import { toast } from "sonner"
import { getStatusColor, getPaymentColor } from "@/lib/utils/statuses";
import EmptyState from "@/components/empty-states/empty-project"

const ITEMS_PER_PAGE = 10;

const BUSINESS_TYPES = [
  { value: "all", label: "All" },
  { value: "agriculture_food_processing", label: "Agriculture & Food Processing" },
  { value: "construction_engineering", label: "Construction & Engineering" },
  { value: "transportation_logistics", label: "Transportation & Logistics" },
  { value: "water_sanitation_services", label: "Water & Sanitation Services" },
  { value: "ict_digital_infrastructure", label: "ICT & Digital Infrastructure" },
  { value: "education_training", label: "Education & Training" },
  { value: "renewable_energy_power_supply", label: "Renewable Energy & Power Supply" },
  { value: "real_estate_development", label: "Real Estate Development" },
  { value: "healthcare_services", label: "Healthcare Services" },
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Company Name: A-Z" },
  { value: "name-desc", label: "Company Name: Z-A" },
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
];

export default function PartnersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [businessType, setBusinessType] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [partners, setPartners] = useState<Partner[]>([]);
  const [totalPartners, setTotalPartners] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartnerData, setSelectedPartnerData] = useState<ApiPartnerDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const formatBusinessType = (type: string) => {
    const businessType = BUSINESS_TYPES.find(t => t.value === type);
    return businessType ? businessType.label : type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" & ");
  };

  useEffect(() => {
    const fetchPartners = async () => {
      setIsLoading(true);
      try {
        const result = await partnersApi.list({
          search: search || undefined,
          business_type: businessType,
          ordering: sortBy === "name-asc" ? "business_name" : sortBy === "name-desc" ? "-business_name" : sortBy === "date-desc" ? "-created_at" : "created_at",
          limit: ITEMS_PER_PAGE,
          offset: (currentPage - 1) * ITEMS_PER_PAGE,
        });

        if (result.success && result.data) {
          // Ensure partners is always an array
          setPartners(result.data.results || []); // Added fallback to empty array
          setTotalPartners(result.data.total || 0);
        } else {
          toast.error(result.message || "Failed to fetch partners");
          setPartners([]); // Reset to empty array on error
          setTotalPartners(0);
        }
      } catch (error) {
        console.error("Error fetching partners:", error);
        toast.error("Failed to fetch partners");
        setPartners([]); // Reset to empty array on error
        setTotalPartners(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartners();
  }, [search, businessType, sortBy, currentPage]);

  const totalPages = Math.ceil(totalPartners / ITEMS_PER_PAGE);

  const handlePartnerClick = async (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    setSheetOpen(true);
    setIsLoadingDetails(true);

    try {
      const result = await partnersApi.getDetails(partnerId);
      if (result.success && result.data) {
        setSelectedPartnerData(result.data);
      } else {
        toast.error(result.message || "Failed to fetch partner details");
        setSelectedPartnerData(null);
      }
    } catch (error) {
      console.error("Error fetching partner details:", error);
      toast.error("Failed to fetch partner details");
      setSelectedPartnerData(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const selectedPartner = selectedPartnerId
    ? partners.find((p) => p.id === selectedPartnerId)
    : null;

  // Safe data extraction with fallbacks
  const partnerDetails = selectedPartnerData || selectedPartner;
  const allSubmissions = selectedPartnerData
    ? [...(selectedPartnerData.eois || []), ...(selectedPartnerData.proposals || []), ...(selectedPartnerData.contracts || [])]
    : [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const hasPaymentStatus = (item: unknown): item is { payment_status: string } => {
    return !!item && typeof item === 'object' && item !== null && 'payment_status' in item && typeof (item as { payment_status: unknown }).payment_status === 'string';
  };

  // Helper function to safely get partner property
  const getPartnerProperty = (property: keyof Partner) => {
    if (selectedPartnerData?.partner) {
      return selectedPartnerData.partner[property];
    }
    if (selectedPartner) {
      return selectedPartner[property];
    }
    return "N/A";
  };

  return (
    <div className="min-h-screen bg-background md:p-4">
      <div className="mx-auto max-w-8xl">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Partners</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all registered partner organisations.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search partners by name, business type"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          <div className="flex gap-3">
            <Select
              value={businessType}
              onValueChange={(value) => {
                setBusinessType(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Business Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>COMPANY NAME</TableHead>
                <TableHead>BUSINESS TYPE</TableHead>
                <TableHead>CONTACT EMAIL</TableHead>
                <TableHead>REGISTERED ON</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    Loading partners...
                  </TableCell>
                </TableRow>
              ) : !partners || partners.length === 0 ? ( // Added null check for partners
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    No partners found
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner) => (
                  <TableRow
                    key={partner.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handlePartnerClick(partner.id)}
                  >
                    <TableCell className="font-medium">
                      {partner.business_name}
                    </TableCell>
                    <TableCell>{formatBusinessType(partner.business_type)}</TableCell>
                    <TableCell className="text-[#C13C3D] underline">{partner.email}</TableCell>
                    <TableCell>{formatDate(partner.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePartnerClick(partner.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, totalPartners)} of {totalPartners}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                «
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹ Previous
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next ›
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                »
              </Button>

              <div className="ml-4 flex items-center gap-2">
                <span className="text-sm">Go to page:</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  className="w-20"
                  value={currentPage} // Changed from defaultValue to value
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= totalPages) {
                      setCurrentPage(value);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading partner details...</p>
            </div>
          ) : partnerDetails ? (
            <>
              <SheetHeader className="flex flex-row items-start justify-between">
                <SheetTitle className="text-2xl">
                  {getPartnerProperty('business_name')}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6 px-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      BUSINESS TYPE
                    </p>
                    <p className="mt-1">
                      {formatBusinessType(getPartnerProperty('business_type'))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      CONTACT NAME
                    </p>
                    <p className="mt-1">{getPartnerProperty('contact_person_name')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      COUNTRY OF INCORPORATION
                    </p>
                    <p className="mt-1 capitalize">{getPartnerProperty('country_of_incorporation')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      EMAIL
                    </p>
                    <p className="mt-1">{getPartnerProperty('email')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      BUSINESS ADDRESS
                    </p>
                    <p className="mt-1">{getPartnerProperty('business_address')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      PHONE NUMBER
                    </p>
                    <p className="mt-1">{getPartnerProperty('phone_number')}</p>
                  </div>
                </div>

                {selectedPartnerData && (
                  <Tabs defaultValue="all" className="mt-8">
                    <TabsList>
                      <TabsTrigger value="all">
                        All{" "}
                        <Badge variant="secondary" className="ml-2">
                          {(selectedPartnerData.eoi_count || 0) + (selectedPartnerData.proposal_count || 0) + (selectedPartnerData.contract_count || 0)}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="eoi">
                        EOI{" "}
                        <Badge variant="secondary" className="ml-2">
                          {selectedPartnerData.eoi_count || 0}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="proposals">
                        Proposals{" "}
                        <Badge variant="secondary" className="ml-2">
                          {selectedPartnerData.proposal_count || 0}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="contracts">
                        Contracts{" "}
                        <Badge variant="secondary" className="ml-2">
                          {selectedPartnerData.contract_count || 0}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="my-6 space-y-4">
                      {allSubmissions.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">No submissions yet</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Their EOIs, proposals, and contracts will appear here once uploaded.
                          </p>
                        </div>
                      ) : (
                        allSubmissions.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                          >
                            <h4 className="font-medium">{item.project_title}</h4>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                #{item.reference_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(item.submission_date)}
                              </p>
                            </div>
                            <div className="mt-2 flex justify-between">
                              <Badge className={`py-2 px-5 rounded-md capitalize ${getStatusColor(item.status)}`}>
                                {item.status}
                              </Badge>
                              {'payment_status' in item && hasPaymentStatus(item) && item.payment_status && (
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${getPaymentColor(item.payment_status)}`} />
                                  <span className="text-sm whitespace-nowrap">
                                    {item.payment_status}
                                  </span>
                                </div>

                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="eoi" className="mt-6 space-y-4">
                      {!selectedPartnerData?.eois || selectedPartnerData.eois.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            <EmptyState
                title="Nothing to see yet"
                description="No registered partners yet. New partners will appear here once they sign up."
              />
                          </p>
                        </div>
                      ) : (
                        selectedPartnerData.eois.map((eoi) => (
                          <div
                            key={eoi.id}
                            className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                          >
                            <h4 className="font-medium">{eoi.project_title}</h4>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                #{eoi.reference_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(eoi.submission_date)}
                              </p>
                            </div>
                            <div className="mt-2 flex justify-between">
                              <Badge className={`py-2 px-5 rounded-md capitalize ${getStatusColor(eoi.status)}`}>
                                {eoi.status}
                              </Badge>
                              {'payment_status' in eoi && hasPaymentStatus(eoi) && eoi.payment_status && (
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${getPaymentColor(eoi.payment_status)}`} />
                                  <span className="text-sm whitespace-nowrap">
                                    {eoi.payment_status}
                                  </span>
                                </div>

                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="proposals" className="mt-6 space-y-4">
                      {!selectedPartnerData?.proposals || selectedPartnerData.proposals.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">No proposal submissions yet</p>
                        </div>
                      ) : (
                        selectedPartnerData.proposals.map((proposal) => (
                          <div
                            key={proposal.id}
                            className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                          >
                            <h4 className="font-medium">{proposal.project_title}</h4>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                #{proposal.reference_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(proposal.submission_date)}
                              </p>
                            </div>
                            <div className="mt-2">
                              <Badge className={`py-2 px-5 rounded-md capitalize ${getStatusColor(proposal.status)}`}>
                                {proposal.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="contracts" className="mt-6 space-y-4">
                      {!selectedPartnerData?.contracts || selectedPartnerData.contracts.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">No contract submissions yet</p>
                        </div>
                      ) : (
                        selectedPartnerData.contracts.map((contract) => (
                          <div
                            key={contract.id}
                            className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                          >
                            <h4 className="font-medium">{contract.project_title}</h4>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                #{contract.reference_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(contract.submission_date)}
                              </p>
                            </div>
                            <div className="mt-2">
                              <Badge className={`py-2 px-5 rounded-md capitalize ${getStatusColor(contract.status)}`}>
                                {contract.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>Failed to load partner details</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}