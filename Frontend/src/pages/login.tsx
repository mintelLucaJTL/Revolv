import {
  AppHeader,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Text,
} from "@jtl-software/platform-ui-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";


const userlogin = "admin";
const userpwd = "123";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (email === userlogin && password === userpwd) {
      setError("");
      navigate("/dashboard");
    } else {
      setError("Ungültige E-Mail oder Passwort.");
    }
  };

  return (
    <Box className="min-h-screen bg-gray-50 flex flex-col">
      {/* JTL App Header */}
      <AppHeader
        title="Revolve Login"
        subtitle="Please sign in to continue."
         actions={
          <Box className="flex items-center gap-3">
            <Button label="Settings" variant="secondary" />
          </Box>
        }
        className="bg-white shadow-sm"
      />

      {/* Login Card */}
      <Box className="flex flex-col items-center justify-center flex-1 p-12">
        <Card className="max-w-[450px] w-full">
          <CardHeader className="items-center">
            <LogIn size={40} color="black" strokeWidth={1.5} />
            <CardTitle>Welcome Back</CardTitle>
            <Badge label="login" variant="default"></Badge>
          </CardHeader>

          <Separator />

          <CardContent className="flex flex-col gap-4 mt-4">
            <Text type="small" color="muted">
              Please sign in to continue.
            </Text>

            <Text type="small">Email</Text>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Text type="small">Password</Text>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <Button label="Sign In" variant="default" onClick={handleLogin} />

            <Separator />

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account? Register below.
            </div>
            <Button label="Create Account" variant="outline" />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}