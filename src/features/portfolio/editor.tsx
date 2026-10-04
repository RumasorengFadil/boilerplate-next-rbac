import { ContentEditor } from "@/features/cms/editor";
import type { ContentInput } from "@/features/cms/schema";

export function PortfolioEditor({ initial, canPublish, readOnly = false }: { initial?: ContentInput; canPublish: boolean; readOnly?: boolean }) {
  return <ContentEditor key={`${initial?.id ?? "new"}:${initial?.version ?? 0}`} initial={initial} canPublish={canPublish} portfolio readOnly={readOnly} />;
}
