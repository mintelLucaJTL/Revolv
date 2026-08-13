import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, Button, Card, Text } from "@jtl-software/platform-ui-react";
import { UserRound } from "lucide-react";
import DeleteAccountModal from "../components/DeleteAccountModal";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import {
  fetchCurrentUser,
  getInitials,
  updateCurrentUserName,
  deleteCurrentUser,
  type CurrentUser,
} from "../utils/user";

function ProfileSkeleton() {
  return (
    <Box className="mt-6 flex flex-col gap-6 max-w-2xl" aria-busy="true">
      <span className="sr-only">Profil wird geladen</span>
      <Card className="p-6 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
        <Box className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Box className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </Box>
        </Box>
      </Card>
      <Card className="p-6 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
        <Skeleton className="h-5 w-44" />
        <Box className="mt-4 space-y-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </Box>
        <Box className="mt-6 flex justify-end">
          <Skeleton className="h-10 w-44" />
        </Box>
      </Card>
      <Card className="p-6 bg-white border border-red-100 dark:bg-slate-900 dark:border-red-900/50">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Box className="mt-4 flex justify-end">
          <Skeleton className="h-10 w-36" />
        </Box>
      </Card>
    </Box>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Load User
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Name Input
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Load User
  useEffect(() => {
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      setNameInput(currentUser.name ?? "");
    } catch (err) {
      console.error("Failed to load current user:", err);
      setLoadError("Profil konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const hasNameChanges = nameInput.trim() !== (user?.name ?? "").trim();

  // PATCH /api/user/me - lets the user update their own name.
  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || isSavingName) return;

    setIsSavingName(true);
    setNameMessage(null);

    try {
      // Update the current user name
      await updateCurrentUserName(trimmed);
      setNameMessage("Name successfully saved.");
      // reload site so the user sees the new name
      window.location.reload();
    } catch (error) {
      console.error("Failed to update current user name:", error);
      setNameMessage("Error saving name. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  // DELETE /api/user/me - lets the user delete their own account.
  const handleDeleteAccount = async () => {
    await deleteCurrentUser();
    await logout();
    setIsDeleteModalOpen(false);
    navigate("/login");
  };

  return (
    <>
      <Text weight="bold">Profil</Text>

          {loading ? (
            <ProfileSkeleton />
          ) : loadError ? (
            <Box className="mt-6 max-w-2xl">
              <Card className="p-8 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <Box className="flex flex-col items-center justify-center gap-3 text-sm text-red-600 dark:text-red-400">
                  <span>{loadError}</span>
                  <Button label="Erneut versuchen" onClick={() => void loadProfile()} />
                </Box>
              </Card>
            </Box>
          ) : (
            <Box className="mt-6 flex flex-col gap-6 max-w-2xl">
              {/* Übersicht: Avatar, Name, E-Mail */}
              <Card className="p-6 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <Box className="flex items-center gap-4">
                  <Avatar text={getInitials(user?.name ?? user?.email)} shape="circle" />
                  <Box>
                    <Text weight="bold">{user?.name?.trim() || "Kein Name gesetzt"}</Text>
                    <Text type="xs" color="muted">
                      {user?.email}
                    </Text>
                  </Box>
                </Box>
              </Card>

              {/* Persönliche Daten bearbeiten */}
              <Card className="p-6 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <Box className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <UserRound size={18} aria-hidden="true" />
                  </span>
                  <Text weight="bold">Persönliche Daten</Text>
                </Box>

                <Box className="mt-4 space-y-4">
                  <label className="block">
                    <Box className="mb-2">
                      <Text type="xs">Anzeigename</Text>
                    </Box>
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="z. B. Max Mustermann"
                      className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </label>

                  <label className="block">
                    <Box className="mb-2">
                      <Text type="xs">E-Mail-Adresse</Text>
                    </Box>
                    <input
                      value={user?.email ?? ""}
                      disabled
                      className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
                    />
                    <Box className="mt-1">
                      <Text type="xs" color="muted">
                        Die E-Mail-Adresse kann derzeit nicht geändert werden.
                      </Text>
                    </Box>
                  </label>
                </Box>

                <Box className="mt-6 flex flex-col gap-3">
                  {nameMessage ? (
                    <Text type="xs" color="muted">
                      {nameMessage}
                    </Text>
                  ) : null}
                  <Box className="flex justify-end">
                    <Button
                      label={isSavingName ? "Speichert…" : "Änderungen speichern"}
                      variant="highlight"
                      onClick={handleSaveName}
                      disabled={!hasNameChanges || isSavingName}
                      isLoading={isSavingName}
                    />
                  </Box>
                </Box>
              </Card>

              {/* Danger Zone: Konto löschen */}
              <Card className="p-6 bg-white border border-red-100 dark:bg-slate-900 dark:border-red-900/50">
                <Text weight="bold">Konto löschen</Text>
                <Box className="mt-2">
                  <Text type="xs" color="muted">
                    Wenn du dein Konto löschst, werden alle deine Daten unwiderruflich entfernt.
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </Text>
                </Box>

                <Box className="mt-4 flex justify-end">
                  <Button
                    label="Konto löschen"
                    variant="destructive"
                    onClick={() => setIsDeleteModalOpen(true)}
                  />
                </Box>
              </Card>
            </Box>
          )}

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </>
  );
}
