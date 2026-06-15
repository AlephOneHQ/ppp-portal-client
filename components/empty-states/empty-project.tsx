import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface EmptyStateProps {
  title: string
  description: string
  iconSrc?: string
  iconAlt?: string
}

const EmptyState = ({
  title,
  description,
  iconSrc = "/icons/empty-box.svg",
  iconAlt = "Empty State Icon",
}: EmptyStateProps) => {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <img src={iconSrc} alt={iconAlt} className="h-24 w-24" />
        </EmptyMedia>
        <EmptyTitle className="text-[#040404]">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export default EmptyState;
