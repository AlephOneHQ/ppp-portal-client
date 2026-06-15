// types/available-project.ts
export interface AvailableProject {
  id: string
  slug: string
  title: string
  description: string
  image: {
    id: string
    file_url: string
    file_name: string
    order?: number
  } | null
  cost: string
  ministry: string
  timeline: string
}
