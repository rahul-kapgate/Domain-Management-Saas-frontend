import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useAuth } from "@/context/AuthContext"; 

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Optional notifications (if you added sonner)
import { toast } from "sonner";

type User = {
  id?: string;          // if your API returns "id"
  _id?: string;         // if your API returns "_id"
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt?: string;
};

const getUserId = (u: User) => u.id || u._id || "";

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth(); // optional
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");

  const [search, setSearch] = useState("");

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Create form
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState<"admin" | "user">("user");

  // Edit form
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [ePassword, setEPassword] = useState(""); // optional (only if you want to change)
  const [eRole, setERole] = useState<"admin" | "user">("user");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [users, search]);

  const fetchUsers = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await api.get("/api/v1/admin"); // GET /
      const data = res?.data?.data;

      // Some APIs return data as array directly; others return {data, meta}
      const list: User[] = Array.isArray(data) ? data : Array.isArray(res?.data) ? res.data : data?.users || [];

      setUsers(list);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load users";
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetCreateForm = () => {
    setCName("");
    setCEmail("");
    setCPassword("");
    setCRole("user");
  };

  const openEdit = (u: User) => {
    setActiveUser(u);
    setEName(u.name || "");
    setEEmail(u.email || "");
    setERole(u.role || "user");
    setEPassword("");
    setEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cName.trim() || !cEmail.trim() || !cPassword.trim()) {
      toast?.error?.("Name, email, password are required");
      return;
    }

    try {
      await api.post("/api/v1/admin/create", {
        name: cName.trim(),
        email: cEmail.trim(),
        password: cPassword,
        role: cRole,
      });

      toast?.success?.("User created");
      setCreateOpen(false);
      resetCreateForm();
      await fetchUsers();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Create failed";
      toast?.error?.(msg);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeUser) return;
    const id = getUserId(activeUser);
    if (!id) return toast?.error?.("User id missing");

    if (!eName.trim() || !eEmail.trim()) {
      toast?.error?.("Name and email are required");
      return;
    }

    try {
      const payload: any = {
        name: eName.trim(),
        email: eEmail.trim(),
        role: eRole,
      };

      // Only send password if admin entered a new one
      if (ePassword.trim()) payload.password = ePassword;

      await api.put(`/api/v1/admin/${id}`, payload);

      toast?.success?.("User updated");
      setEditOpen(false);
      setActiveUser(null);
      await fetchUsers();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Update failed";
      toast?.error?.(msg);
    }
  };

  const handleDelete = async (u: User) => {
    const id = getUserId(u);
    if (!id) return toast?.error?.("User id missing");

    try {
      await api.delete(`/api/v1/admin/${id}`);
      toast?.success?.("User deleted");
      await fetchUsers();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Delete failed";
      toast?.error?.(msg);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Admin Dashboard</CardTitle>
            <CardDescription>
              Manage users (create, edit, delete).
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.email || "admin"}</span>
            </div>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Top bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Input
                className="w-full md:w-[320px]"
                placeholder="Search by name/email/role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {/* Create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setCreateOpen(true)}>+ Add User</Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create User</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Rahul" />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      placeholder="rahul@gmail.com"
                      type="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      placeholder="••••••••"
                      type="password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={cRole} onValueChange={(v) => setCRole(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCreateOpen(false);
                        resetCreateForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {errMsg ? (
            <div className="text-sm text-red-600">{errMsg}</div>
          ) : null}

          {/* Users table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[120px]">Role</TableHead>
                  <TableHead className="w-[220px]">Created</TableHead>
                  <TableHead className="w-[220px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={getUserId(u) || `${u.email}-${u.role}`}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(u.createdAt)}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                            Edit
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(u)}>
                                  Delete
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Edit dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={eName} onChange={(e) => setEName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={eEmail} onChange={(e) => setEEmail(e.target.value)} type="email" />
                </div>

                <div className="space-y-2">
                  <Label>New Password (optional)</Label>
                  <Input
                    value={ePassword}
                    onChange={(e) => setEPassword(e.target.value)}
                    placeholder="Leave blank to keep same password"
                    type="password"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={eRole} onValueChange={(v) => setERole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditOpen(false);
                      setActiveUser(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
