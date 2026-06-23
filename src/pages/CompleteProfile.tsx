import { FormEvent, useState } from "react";
import { UserRoundCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";

export function CompleteProfile() {
  const { user, profile, loading, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.full_name) return <Navigate to="/predictions" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fullName.trim().length < 2) {
      toast.error("Escribe tu nombre completo.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(fullName);
      toast.success("Perfil completado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos guardar tu perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="flag-band h-1.5" />
        <CardHeader>
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-md bg-secondary text-primary shadow-sm">
            <UserRoundCheck className="h-6 w-6" />
          </div>
          <CardTitle>Completa tu perfil</CardTitle>
          <CardDescription>Este nombre aparecera en la tabla de posiciones y en tus predicciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="full-name">Nombre completo</Label>
              <Input
                id="full-name"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={saving}>
              Guardar y entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
