"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateUser, useUpdateUser } from "@/lib/hooks/use-users";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(3, "يجب أن يكون 3 أحرف على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().optional(),
  fullName: z.string().min(2, "يجب أن يكون حرفين على الأقل"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type FormData = z.infer<typeof formSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const t = useTranslations();
  const isEdit = !!user;

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      fullName: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (open) {
      // Clear form completely first
      form.clearErrors();

      if (user) {
        form.reset({
          username: user.username || "",
          email: user.email || "",
          password: "",
          fullName: user.fullName || "",
          status: user.status || "ACTIVE",
        });
      } else {
        // For new user, ensure all fields are empty
        form.reset({
          username: "",
          email: "",
          password: "",
          fullName: "",
          status: "ACTIVE",
        });
      }
    } else {
      // When dialog is closed, reset form
      form.reset({
        username: "",
        email: "",
        password: "",
        fullName: "",
        status: "ACTIVE",
      });
    }
  }, [user, form, open]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        // Only send the fields backend accepts for update: email, fullName, status
        const updateData: any = {
          email: data.email,
          fullName: data.fullName,
          status: data.status,
        };
        await updateUser.mutateAsync({ id: user.id, data: updateData });
      } else {
        if (!data.password || data.password.length < 6) {
          form.setError("password", { message: "كلمة المرور مطلوبة (6 أحرف على الأقل)" });
          return;
        }
        // Only send the fields backend expects for create
        const createData = {
          username: data.username,
          email: data.email,
          password: data.password,
          fullName: data.fullName,
        };
        await createUser.mutateAsync(createData);
      }
      handleClose(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      form.reset({
        username: "",
        email: "",
        password: "",
        fullName: "",
        status: "ACTIVE",
      });
    }
    onOpenChange(open);
  };

  const isLoading = createUser.isPending || updateUser.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose} key={user?.id || 'new-user'}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("users.editUser") : t("users.addUser")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form} key={open ? (user?.id || 'new') : 'closed'}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.fields.fullName")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.fields.username")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.fields.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("users.fields.password")}
                    {isEdit && (
                      <span className="text-muted-foreground text-xs mr-2">
                        ({t("users.passwordHint")})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">
                    {t("users.fields.isActive")}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value === "ACTIVE"}
                      onCheckedChange={(checked) => field.onChange(checked ? "ACTIVE" : "INACTIVE")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
