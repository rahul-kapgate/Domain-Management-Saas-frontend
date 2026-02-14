import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";

type Domain = {
  id?: string;
  _id?: string;
  domainName: string;
  status: "active" | "inactive";
  createdAt?: string;
};

const getId = (d: Domain) => d.id || d._id || "";

function formatDate(iso?: string) {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default function UserDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [search, setSearch] = useState("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [domainName, setDomainName] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return domains;
    return domains.filter((d) => d.domainName.toLowerCase().includes(q));
  }, [domains, search]);

  const fetchDomains = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await api.get("/api/v1/user/domains");
      const list: Domain[] = Array.isArray(res?.data?.data) ? res.data.data : res.data?.data?.domains || [];
      setDomains(list);
    } catch (e: any) {
      setErrMsg(e?.response?.data?.message || e?.message || "Failed to load domains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domainName.trim()) {
      toast.error("Domain name is required");
      return;
    }

    try {
      await api.post("/api/v1/user/domains", { domainName });
      toast.success("Domain added");
      setDomainName("");
      setAddOpen(false);
      await fetchDomains();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to add domain");
    }
  };

  // Optional: toggle status if you have PATCH endpoint
  const toggleStatus = async (d: Domain) => {
    const id = getId(d);
    if (!id) return toast.error("Domain id missing");

    const next = d.status === "active" ? "inactive" : "active";

    try {
      await api.patch(`/api/v1/user/domains/${id}`, { status: next });
      toast.success("Status updated");
      await fetchDomains();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update status");
    }
  };


  return (
    <div className="p-4 md:p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">My Domains</CardTitle>
            <CardDescription>View and manage your domains.</CardDescription>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDomains} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>+ Add Domain</Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Domain</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Domain Name</Label>
                    <Input
                      value={domainName}
                      onChange={(e) => setDomainName(e.target.value)}
                      placeholder="example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: don’t include http/https. (we’ll normalize it)
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddOpen(false);
                        setDomainName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Input
              className="md:w-[320px]"
              placeholder="Search domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {errMsg ? <div className="text-sm text-red-600">{errMsg}</div> : null}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead className="w-35">Status</TableHead>
                  <TableHead className="w-55">Created</TableHead>
                  <TableHead className="w-65 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Loading domains...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No domains found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d) => (
                    <TableRow key={getId(d) || d.domainName}>
                      <TableCell className="font-medium">{d.domainName}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "active" ? "default" : "secondary"}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(d.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Optional toggle */}
                          <Button variant="outline" size="sm" onClick={() => toggleStatus(d)}>
                            {d.status === "active" ? "Deactivate" : "Activate"}
                          </Button>

                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
