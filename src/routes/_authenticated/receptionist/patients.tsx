import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Card } from "@/components/clinic/DashboardShell";
import { usePatients } from "@/hooks/usePatients";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/receptionist/patients")({
  component: PatientsRegistry,
});

function PatientsRegistry() {
  const { patients, loading } = usePatients();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    const lower = searchTerm.toLowerCase();
    return patients.filter(
      (p) => p.name.toLowerCase().includes(lower) || p.phone.toLowerCase().includes(lower)
    );
  }, [patients, searchTerm]);

  if (loading) {
    return (
      <DashboardShell title="Patient Registry" subtitle="Clinic-wide patient history" badge="Registry" hideHeader={true}>
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Patient Registry" subtitle="Clinic-wide patient history" badge="Registry" hideHeader={true}>
      <div className="mb-6 flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or phone..." 
            className="pl-9" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredPatients.length} patients
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-4 font-medium">Patient Name</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Total Visits</th>
                <th className="px-6 py-4 font-medium">Last Visit</th>
                <th className="px-6 py-4 font-medium">Preferred Doctor</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(p => (
                <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{p.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{p.phone}</td>
                  <td className="px-6 py-4 text-muted-foreground">{p.visit_count}</td>
                  <td className="px-6 py-4 text-muted-foreground">{p.last_visit_date}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {/* @ts-ignore - The join maps doctors to an object or array depending on the query shape */}
                    {p.doctors?.name || "—"}
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}
