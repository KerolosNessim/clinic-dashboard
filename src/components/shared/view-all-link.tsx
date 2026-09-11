import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { ArrowUpLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";

type ViewAllLinkProps = {
  href: string;
  label?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  icon?: LucideIcon;
};

/** The "عرض الكل" link used at the top of list/table cards across the app */
export function ViewAllLink({
  href,
  label = "عرض الكل",
  variant = "default",
  icon: Icon = ArrowUpLeft,
}: ViewAllLinkProps) {
  return (
    <Button variant={variant} size="lg" nativeButton={false} render={<Link href={href} />}>
      {label}
      <Icon data-icon="inline-end" />
    </Button>
  );
}
