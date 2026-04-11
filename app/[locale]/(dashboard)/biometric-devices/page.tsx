"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Wifi, WifiOff, Fingerprint, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBiometricDevices,
  useCreateBiometricDevice,
  useUpdateBiometricDevice,
  useDeleteBiometricDevice,
} from "@/lib/hooks/use-biometric-devices";
import { BiometricDevice, CreateBiometricDeviceData, UpdateBiometricDeviceData } from "@/lib/api/biometric-devices";

interface DeviceFormData {
  serialNumber: string;
  nameAr: string;
  nameEn: string;
  location: string;
  ipAddress: string;
  model: string;
  isActive: boolean;
}

const EMPTY_FORM: DeviceFormData = {
  serialNumber: "",
  nameAr: "",
  nameEn: "",
  location: "",
  ipAddress: "",
  model: "",
  isActive: true,
};

export default function BiometricDevicesPage() {
  const t = useTranslations("biometricDevices");
  const tCommon = useTranslations("common");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BiometricDevice | null>(null);
  const [form, setForm] = useState<DeviceFormData>(EMPTY_FORM);

  const { data: devices, isLoading } = useBiometricDevices();
  const createDevice = useCreateBiometricDevice();
  const updateDevice = useUpdateBiometricDevice();
  const deleteDevice = useDeleteBiometricDevice();

  const deviceList: BiometricDevice[] = (devices as any) || [];

  function openCreate() {
    setSelectedDevice(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(device: BiometricDevice) {
    setSelectedDevice(device);
    setForm({
      serialNumber: device.serialNumber,
      nameAr: device.nameAr,
      nameEn: device.nameEn || "",
      location: device.location || "",
      ipAddress: device.ipAddress || "",
      model: device.model || "",
      isActive: device.isActive,
    });
    setDialogOpen(true);
  }

  function openDelete(device: BiometricDevice) {
    setSelectedDevice(device);
    setDeleteDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.nameAr.trim() || !form.serialNumber.trim()) return;

    if (selectedDevice) {
      const updateData: UpdateBiometricDeviceData = {
        nameAr: form.nameAr,
        nameEn: form.nameEn || undefined,
        location: form.location || undefined,
        ipAddress: form.ipAddress || undefined,
        model: form.model || undefined,
        isActive: form.isActive,
      };
      updateDevice.mutate({ id: selectedDevice.id, data: updateData }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      const createData: CreateBiometricDeviceData = {
        serialNumber: form.serialNumber,
        nameAr: form.nameAr,
        nameEn: form.nameEn || undefined,
        location: form.location || undefined,
        ipAddress: form.ipAddress || undefined,
        model: form.model || undefined,
        isActive: form.isActive,
      };
      createDevice.mutate(createData, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  }

  function handleDelete() {
    if (!selectedDevice) return;
    deleteDevice.mutate(selectedDevice.id, {
      onSuccess: () => setDeleteDialogOpen(false),
    });
  }

  const activeCount = deviceList.filter((d) => d.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        count={deviceList.length}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("addDevice")}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("stats.total")}</p>
              <p className="text-2xl font-bold">{deviceList.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2.5 rounded-lg bg-green-100">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("stats.active")}</p>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2.5 rounded-lg bg-gray-100">
              <WifiOff className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("stats.inactive")}</p>
              <p className="text-2xl font-bold text-gray-500">{deviceList.length - activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : deviceList.length === 0 ? (
            <EmptyState
              icon={<Fingerprint className="h-10 w-10" />}
              title={t("empty.title")}
              description={t("empty.description")}
              action={
                <Button onClick={openCreate} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("addDevice")}
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.serialNumber")}</TableHead>
                    <TableHead>{t("table.location")}</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>{t("table.model")}</TableHead>
                    <TableHead>{t("table.lastSync")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceList.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.nameAr}</p>
                          {device.nameEn && (
                            <p className="text-xs text-muted-foreground">{device.nameEn}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {device.serialNumber}
                        </code>
                      </TableCell>
                      <TableCell>{device.location || "—"}</TableCell>
                      <TableCell>
                        {device.ipAddress ? (
                          <code className="text-xs">{device.ipAddress}</code>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{device.model || "—"}</TableCell>
                      <TableCell>
                        {device.lastSyncAt
                          ? new Date(device.lastSyncAt).toLocaleDateString("ar-EG")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={device.isActive ? "default" : "secondary"}
                          className={device.isActive ? "bg-green-600" : ""}
                        >
                          {device.isActive ? t("status.active") : t("status.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(device)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDelete(device)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDevice ? t("dialog.editTitle") : t("dialog.addTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("form.nameAr")} *</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  placeholder={t("form.nameArPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.nameEn")}</Label>
                <Input
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  placeholder={t("form.nameEnPlaceholder")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.serialNumber")} *</Label>
              <Input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                placeholder={t("form.serialNumberPlaceholder")}
                disabled={!!selectedDevice}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("form.location")}</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder={t("form.locationPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.ipAddress")}</Label>
                <Input
                  value={form.ipAddress}
                  onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.model")}</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder={t("form.modelPlaceholder")}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="cursor-pointer">{t("form.isActive")}</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.nameAr.trim() || !form.serialNumber.trim() || createDevice.isPending || updateDevice.isPending}
            >
              {selectedDevice ? t("dialog.save") : t("dialog.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("delete.title")}
        description={t("delete.description", { name: selectedDevice?.nameAr ?? "" })}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
