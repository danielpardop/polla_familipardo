import { FormEvent, type ReactNode, useState } from "react";
import { Eye, EyeOff, Flag, KeyRound, ListChecks, ShieldCheck, Trophy, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

export function Login() {
  const { signInWithPassword, signUpWithPassword, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      toast.success("Sesion iniciada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos iniciar sesion.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fullName.trim().length < 2) {
      toast.error("Escribe tu nombre completo.");
      return;
    }

    setLoading(true);
    try {
      await signUpWithPassword(email, password, fullName);
      toast.success("Cuenta creada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Escribe tu correo.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email);
      toast.success("Te enviamos un enlace para cambiar la contrasena.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos enviar el correo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-stretch px-3 py-4 sm:place-items-center sm:px-4 sm:py-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-lg border bg-white/96 shadow-soft ring-1 ring-white/70 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="relative bg-primary p-4 text-primary-foreground lg:hidden">
          <div className="absolute inset-x-0 top-0 h-2 flag-band" />
          <div className="flex items-center gap-3 pt-2">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-secondary text-primary shadow-sm ring-1 ring-white/20">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-tight">Polla Familia Pardo</h1>
              <p className="mt-1 text-xs font-bold text-white/78">Pronosticos de Colombia para jugar en familia.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ScoreRule value="6" label="Marcador exacto" />
            <ScoreRule value="4" label="Diferencia o empate" />
            <ScoreRule value="3" label="Solo ganador" />
            <ScoreRule value="+1" label="Por goleador" />
          </div>
        </section>
        <section className="relative hidden min-h-[620px] overflow-hidden bg-primary p-8 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-x-0 top-0 h-3 flag-band" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(135deg, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div>
            <div className="relative grid h-14 w-14 place-items-center rounded-lg bg-secondary text-primary shadow-sm ring-1 ring-white/20">
              <Trophy className="h-8 w-8" />
            </div>
            <h1 className="relative mt-8 max-w-md text-5xl font-black leading-none">Polla Familia Pardo</h1>
            <p className="relative mt-4 max-w-sm text-base font-bold leading-relaxed text-white/78">
              Una dinamica familiar para seguir a Colombia: predice marcadores, escoge goleadores y suma puntos con cada acierto.
            </p>
            <div className="relative mt-8 grid gap-3 text-sm font-bold text-white/82">
              <LoginNote icon={<Flag className="h-4 w-4" />} text="Solo jugamos con los partidos de Colombia." />
              <LoginNote icon={<ListChecks className="h-4 w-4" />} text="Tus predicciones quedan bloqueadas cuando empieza el partido." />
              <LoginNote icon={<Users className="h-4 w-4" />} text="La tabla muestra total, puntos por marcador y goleadores acertados." />
            </div>
          </div>
          <div className="relative grid grid-cols-4 gap-3">
            <ScoreRule value="6" label="Exacto" />
            <ScoreRule value="4" label="Diferencia / empate" />
            <ScoreRule value="3" label="Ganador" />
            <ScoreRule value="+1" label="Goleador" />
          </div>
        </section>

        <Card className="rounded-none border-0 bg-white shadow-none">
          <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Entra a la polla
            </CardTitle>
            <CardDescription>
              {showRecovery
                ? "Te enviamos un enlace para crear una contrasena nueva."
                : "Usa tu correo para entrar o crear tu cuenta. No necesitas confirmar el correo para empezar."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="login" onClick={() => setShowRecovery(false)}>Entrar</TabsTrigger>
                <TabsTrigger value="register" onClick={() => setShowRecovery(false)}>Registro</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                {showRecovery ? (
                  <form className="space-y-4" onSubmit={handlePasswordReset}>
                    <div className="rounded-md border bg-muted/65 p-3 text-sm font-bold leading-relaxed text-muted-foreground">
                      Escribe el correo con el que te registraste y te enviaremos el enlace para recuperar el acceso.
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Correo</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </div>
                    <Button className="w-full" type="submit" disabled={loading}>
                      Enviar enlace
                    </Button>
                    <Button className="w-full" type="button" variant="ghost" onClick={() => setShowRecovery(false)} disabled={loading}>
                      Volver a entrar
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleLogin}>
                    <div className="rounded-md bg-secondary/25 p-3 text-sm font-extrabold leading-relaxed text-primary">
                      Hola familia, entra para guardar tus pronosticos y ver como va la tabla.
                    </div>
                    <AuthFields email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
                        onClick={() => setShowRecovery(true)}
                      >
                        Olvide mi contrasena
                      </button>
                    </div>
                    <Button className="w-full" type="submit" disabled={loading}>
                      <KeyRound className="h-4 w-4" />
                      Entrar
                    </Button>
                  </form>
                )}
              </TabsContent>
              <TabsContent value="register">
                <form className="space-y-4" onSubmit={handleRegister}>
                  <div className="rounded-md bg-muted/65 p-3 text-sm font-bold leading-relaxed text-muted-foreground">
                    Crea tu cuenta con tu nombre para que la familia te reconozca en la tabla.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nombre completo</Label>
                    <Input
                      id="register-name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                    />
                  </div>
                  <AuthFields email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
                  <Button className="w-full" type="submit" disabled={loading}>
                    <UserPlus className="h-4 w-4" />
                    Crear cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ScoreRule({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white/10 p-3 sm:p-4">
      <p className="text-xl font-black text-secondary sm:text-2xl">{value}</p>
      <p className="truncate text-[11px] font-extrabold text-white/75 sm:text-xs">{label}</p>
    </div>
  );
}

function LoginNote({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-white/10 p-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/12 text-secondary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function AuthFields({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="login-email">Correo</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Contrasena</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            minLength={6}
            value={password}
            className="pr-11"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
            title={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
