import { Box, Card, CardHeader, CardTitle, CardContent, Text, Button } from '@jtl-software/platform-ui-react';
import { Rocket } from 'lucide-react';

export default function App() {
  return (
    <Box className="flex justify-center p-12 bg-gray-50 min-h-screen">
      <Card className="max-w-[500px] w-full">
        
        <CardHeader className="items-center">
          <Rocket size={40} color="#6D28D9" strokeWidth={1.5} />
          <CardTitle>Revolv Frontend steht!</CardTitle>
        </CardHeader>
        
        <CardContent className="flex flex-col gap-4 text-center">
          <Text type="small" color="muted">
            Das JTL UI Toolkit ist erfolgreich installiert und einsatzbereit für unser Retouren-Dashboard.
          </Text>
          <Button label="Los geht's!" variant="default" />
        </CardContent>

      </Card>
    </Box>
  );
}