import { Box, Card, Stack, Button, CardTitle } from "@jtl-software/platform-ui-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Registrieren() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("Bitte gib deinen Namen ein");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwörter stimmen nicht überein");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5215/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email, password }),
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
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Passwort"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Passwort bestätigen"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button label={loading ? "Registriere..." : "Registrieren"} onClick={handleRegister} />
          <Button label="Zurück zum login" variant="secondary" onClick={() => navigate("/login")} />
        </Stack>
      </Card>
    </Box>
  );
}
