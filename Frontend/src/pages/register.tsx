import { Box, Card, Stack, Input, Button, CardTitle } from "@jtl-software/platform-ui-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Registrieren() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;

    const emailEl = document.querySelector('input[placeholder="E-Mail"]') as HTMLInputElement | null;
    const pwEl = document.querySelector('input[placeholder="Passwort"]') as HTMLInputElement | null;
    const confirmEl = document.querySelector('input[placeholder="Passwort bestätigen"]') as HTMLInputElement | null;

    if (!emailEl || !pwEl || !confirmEl) {
      alert("Eingabefelder nicht gefunden");
      return;
    }

    const email = emailEl.value.trim();
    const password = pwEl.value;
    const confirm = confirmEl.value;

    if (password !== confirm) {
      alert("Passwörter stimmen nicht überein");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5215/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        navigate("/login");
        return;
      }

      let msg = `Fehler ${res.status}`;
      try {
        const json = await res.json();
        msg = json?.message || JSON.stringify(json) || msg;
      } catch {}
      alert(msg);
    } catch (error) {
      alert("Netzwerkfehler — bitte erneut versuchen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <Stack>
          <CardTitle>Account erstellen</CardTitle>
          <Input placeholder="Name" />
          <Input placeholder="E-Mail" type="email" />
          <Input placeholder="Passwort" type="password" />
          <Input placeholder="Passwort bestätigen" type="password" />
          <Button label={loading ? "Registriere..." : "Registrieren"} onClick={handleRegister} />
          <Button label="Zurück zum login" variant="secondary" onClick={() => navigate("/login")} />
        </Stack>
      </Card>
    </Box>
  );
}
