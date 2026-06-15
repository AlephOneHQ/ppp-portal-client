export interface ContractData {
  id: string
  title: string
  reference_number?: string
  project_title?: string
  partner_name?: string
  partner_contact_name?: string
  commences_on?: string
  ends_on?: string
  estimated_project_cost?: number
  scope_of_service?: string
  oyntcda_roles?: string
  partner_responsibilities?: string
  capital_structure?: string
  payment_mechanism?: string
  revenue_sharing?: string
  kpis?: string
  slas?: string
  monitoring_and_reporting?: string
  dispute_resolution?: string
  termination_and_exit_clauses?: string
  miscellaneous?: string
  status?: string
  milestones?: unknown[]
}