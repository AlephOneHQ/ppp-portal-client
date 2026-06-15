import { api } from "../apiConfig"
import type { ApiResponse } from "../apiConfig"
import { extractErrorMessage } from "./errorUtils"

export interface Partner {
  id: string;
  business_name: string;
  business_type: string;
  email: string;
  created_at: string;
  contact_person_name: string;
  country_of_incorporation: string;
  business_address: string;
  phone_number: string;
}

export interface PartnerDetails {
  partner: {
    id: string;
    email: string;
    business_name: string;
    business_type: string;
    country_of_incorporation: string;
    business_address: string;
    contact_person_name: string;
    phone_number: string;
    created_at: string;
  };
  eois: Array<{
    id: string;
    project_title: string;
    reference_id: string;
    submission_date: string;
    status: string;
    payment_status: string;
  }>;
  proposals: Array<{
    id: string;
    project_title: string;
    reference_id: string;
    submission_date: string;
    status: string;
    document_url: string;
  }>;
  contracts: Array<{
    id: string;
    project_title: string;
    reference_id: string;
    submission_date: string;
    status: string;
  }>;
  eoi_count: number;
  proposal_count: number;
  contract_count: number;
}

export interface PartnerListResponse {
  results: Partner[];
  total: number;
  limit: number;
  offset: number;
}

export const partnersApi = {
  async list(params?: {
    search?: string;
    business_type?: string;
    ordering?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<PartnerListResponse>> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.search) queryParams.append('search', params.search);
      if (params?.business_type && params.business_type !== 'all') {
        queryParams.append('business_type', params.business_type);
      }
      if (params?.ordering) queryParams.append('ordering', params.ordering);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `/auth/partners/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await api.get<PartnerListResponse>(url);

      // Transform to match ApiResponse interface
      return {
        success: true,
        data: response.data,
        message: 'Partners fetched successfully'
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: extractErrorMessage(error, 'Failed to fetch partners'),
      };
    }
  },

  async getDetails(partnerId: string): Promise<ApiResponse<PartnerDetails>> {
    try {
      const response = await api.get<PartnerDetails>(`/auth/partners/${partnerId}/submissions/`);
      return { success: true, data: response.data, message: 'Partner details fetched successfully' };
    } catch (error: unknown) {
      return {
        success: false,
        message: extractErrorMessage(error, 'Failed to fetch partner details'),
      };
    }
  },
};
