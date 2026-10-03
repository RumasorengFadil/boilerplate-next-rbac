import { getScoringConfig } from "@/features/leads/scoring";
import { ScoringForm } from "@/features/leads/scoring-form";
export default async function ScoringPage() {
  const data=await getScoringConfig();
  return <section><h1 className="page-title">Aturan lead scoring</h1><p className="mt-3 text-sm text-slate-600">Konfigurasi global · versi {data.version}. Awalnya nonaktif sampai kebijakan bisnis ditentukan admin.</p><ScoringForm {...data}/></section>;
}
