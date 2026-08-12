import SetPasswordCard from "../components/SetPasswordCard";

export default function AcceptInvitePage() {
  return (
    <SetPasswordCard
      title="Willkommen bei Revolv"
      description="Du wurdest zu einem Team eingeladen. Lege dein Passwort fest, um loszulegen."
      submitLabel="Konto aktivieren"
      missingTokenMessage="Kein gültiger Einladungslink. Bitte bei einem Admin einen neuen anfordern."
    />
  );
}
