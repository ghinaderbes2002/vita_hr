"use client";

import { useState } from "react";
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
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useChangePassword } from "@/lib/hooks/use-users";

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
    newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function ChangePasswordDialog({ open, onOpenChange, user }: ChangePasswordDialogProps) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePassword = useChangePassword();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleClose = (open: boolean) => {
    if (!open) {
      form.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
    onOpenChange(open);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await changePassword.mutateAsync({
        id: user.id,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      handleClose(false);
    } catch {
      // handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>تغيير كلمة المرور — {user?.fullName || user?.username}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور الحالية</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showCurrent ? "text" : "password"} {...field} className="pl-10" />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور الجديدة</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showNew ? "text" : "password"} {...field} className="pl-10" />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تأكيد كلمة المرور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showConfirm ? "text" : "password"} {...field} className="pl-10" />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                تغيير كلمة المرور
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
