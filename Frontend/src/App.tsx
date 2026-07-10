import {
  Box,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Text,
  Separator,
  Alert,
  Badge,
} from "@jtl-software/platform-ui-react";
import { UserPlus, LogIn } from "lucide-react";

export default function App() {
  return (
    <Box className="flex flex-col items-center gap-6 p-12 bg-gray-50 min-h-screen">

      {/* Register Card */}
      <Card className="max-w-[500px] w-full">
        <CardHeader className="items-center">
          <UserPlus size={40} color="black" strokeWidth={1.5} />
          <CardTitle>Register</CardTitle>
          <Badge variant="default">New Account</Badge>
        </CardHeader>

        <Separator />

        <CardContent className="flex flex-col gap-4 mt-4">
          <Alert>Create your account to get started.</Alert>
          <Text type="small" color="muted">Email</Text>
          <Input placeholder="Email" type="email" />
          <Text type="small" color="muted">Password</Text>
          <Input placeholder="Password" type="password" />
          <Button label="Register" variant="default" />
        </CardContent>
      </Card>

      {/* Login Card */}
      <Card className="max-w-[500px] w-full">
        <CardHeader className="items-center">
          <LogIn size={40} color="black" strokeWidth={1.5} />
          <CardTitle>Login</CardTitle>
          <Badge variant="default">Welcome Back</Badge>
        </CardHeader>

        <Separator />

        <CardContent className="flex flex-col gap-4 mt-4">
          <Text type="small" color="muted">Email</Text>
          <Input placeholder="Email" type="email" />
          <Text type="small" color="muted">Password</Text>
          <Input placeholder="Password" type="password" />
          <Button label="Login" variant="default" />
        </CardContent>
      </Card>

    </Box>
  );
}