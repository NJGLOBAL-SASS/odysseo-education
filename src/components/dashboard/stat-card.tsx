import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-fond text-rouge">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-sm text-gris">{label}</p>
    </div>
  );
}
