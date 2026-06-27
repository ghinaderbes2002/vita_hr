"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCreateMaintenanceRequest } from "@/lib/hooks/use-maintenance-requests";
import { WorkLocation, MaintenancePriority } from "@/lib/api/maintenance-requests";

const schema = z.object({
  workLocation: z.enum(["SHAHBA", "CENTER", "NEW_ALEPPO"]),
  assetType: z.string().min(1, "Asset type is required"),
  assetNumber: z.string().optional(),
  brandModel: z.string().optional(),
  faultDescription: z.string().min(5, "Description must be at least 5 characters"),
  priority: z.enum(["URGENT", "HIGH", "NORMAL"]),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORK_LOCATIONS: WorkLocation[] = ["SHAHBA", "CENTER", "NEW_ALEPPO"];
const PRIORITIES: MaintenancePriority[] = ["URGENT", "HIGH", "NORMAL"];

export function MaintenanceRequestDialog({ open, onOpenChange }: Props) {
  const t = useTranslations();
  const createRequest = useCreateMaintenanceRequest();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      workLocation: "CENTER",
      assetType: "",
      assetNumber: "",
      brandModel: "",
      faultDescription: "",
      priority: "NORMAL",
    },
  });

  const onSubmit = async (data: FormData) => {
    await createRequest.mutateAsync({
      workLocation: data.workLocation,
      assetType: data.assetType,
      assetNumber: data.assetNumber || undefined,
      brandModel: data.brandModel || undefined,
      faultDescription: data.faultDescription,
      priority: data.priority,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("maintenance.createTitle")}</DialogTitle>
          <DialogDescription>{t("maintenance.createDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("maintenance.fields.workLocation")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WORK_LOCATIONS.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {t(`maintenance.workLocations.${loc}` as any)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("maintenance.fields.priority")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {t(`maintenance.priorities.${p}` as any)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("maintenance.fields.assetType")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("maintenance.fields.assetTypePlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assetNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("maintenance.fields.assetNumber")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("maintenance.fields.assetNumberPlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brandModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("maintenance.fields.brandModel")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("maintenance.fields.brandModelPlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="faultDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("maintenance.fields.faultDescription")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder={t("maintenance.fields.faultDescriptionPlaceholder")}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
