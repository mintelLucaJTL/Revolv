import SetPasswordCard from "../components/SetPasswordCard";

export default function ResetPasswordPage() {
  return (
    <SetPasswordCard
      title="Neues Passwort vergeben"
      submitLabel="Passwort speichern"
      missingTokenMessage="Kein gültiger Reset-Link. Bitte fordere einen neuen Link an."
    />
  );
}
