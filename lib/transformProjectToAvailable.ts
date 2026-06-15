import type { Project } from "@/types/projects"
import type { AvailableProject } from "@/types/available-project"

export const transformToAvailableProject = (
  project: Project
): AvailableProject => ({
  id: project.id,
  slug: project.id,
  title: project.title,
  description: project.executive_summary || "",
  image: project.gallery_images?.[0] || null,
  cost: project.estimated_cost
    ? `₦${Number(project.estimated_cost).toLocaleString()}`
    : "TBD",
  ministry: project.authorizing_sector?.name || "—",
  timeline:
          project.proposed_start_date && project.estimated_completion_date
            ? `${new Date(project.proposed_start_date).toLocaleDateString()} - ${new Date(project.estimated_completion_date).toLocaleDateString()}`
            : "TBD",
})
