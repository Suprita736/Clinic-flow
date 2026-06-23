import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, Card } from "@/components/clinic/DashboardShell";
import { useDoctors } from "@/hooks/useDoctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/receptionist/doctors")({
  component: DoctorsManagement,
});

function DoctorsManagement() {
  const { allDoctors, loading, addDoctor, editDoctor, deleteDoctor } = useDoctors();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const openModal = (doc?: typeof allDoctors[0]) => {
    if (doc) {
      setEditingId(doc.id);
      setName(doc.name);
      setSpecialization(doc.specialization || "");
      setIsActive(doc.is_active ?? true);
    } else {
      setEditingId(null);
      setName("");
      setSpecialization("");
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");

    setBusy(true);
    try {
      if (editingId) {
        await editDoctor(editingId, name, specialization, isActive);
        toast.success("Doctor updated successfully");
      } else {
        await addDoctor(name, specialization);
        toast.success("Doctor added successfully");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save doctor");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, docName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${docName}?`)) return;
    
    setBusy(true);
    try {
      await deleteDoctor(id);
      toast.success("Doctor deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete doctor");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Doctors" subtitle="Manage clinic doctors" badge="Management" hideHeader={true}>
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Doctors" subtitle="Manage clinic doctors" badge="Management" hideHeader={true}>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => openModal()} className="gap-2">
          <Plus className="h-4 w-4" /> Add Doctor
        </Button>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Specialization</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Currently Serving</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allDoctors.map(doc => (
                <tr key={doc.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                  <td className="px-6 py-4 font-medium text-foreground">{doc.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{doc.specialization || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      doc.is_active ? "bg-mint/10 text-mint-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${doc.is_active ? "bg-mint animate-pulse" : "bg-muted-foreground"}`} />
                      {doc.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {doc.currently_serving ? `#${doc.currently_serving}` : "None"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openModal(doc)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(doc.id, doc.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {allDoctors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    No doctors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md animate-in fade-in zoom-in-95 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">{editingId ? "Edit Doctor" : "Add Doctor"}</h3>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-name">Name</Label>
                <Input id="doc-name" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Doe" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-spec">Specialization</Label>
                <Input id="doc-spec" value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="General Medicine" />
              </div>
              {editingId && (
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="doc-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
                  <Label htmlFor="doc-active">Active (Visible in queues)</Label>
                </div>
              )}
              <Button type="submit" className="w-full mt-4" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Doctor"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
