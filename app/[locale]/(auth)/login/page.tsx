"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";

const schema = z.object({
  username: z.string().min(1, "مطلوب"),
  password: z.string().min(6, "6 أحرف على الأقل"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLocalLoading(true);
    try {
      await login(data.username, data.password);
      // Reload page - middleware will handle redirect to dashboard
      window.location.reload();
    } catch (error: any) {
      let errorMessage = "خطأ في تسجيل الدخول";

      if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
        errorMessage = "لا يمكن الاتصال بالخادم - تحقق من الاتصال بالإنترنت";
      } else if (error.response?.status === 401) {
        errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(t("loginFailed"), {
        description: errorMessage,
      });
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Briefcase className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Vita HR</h1>
              <p className="text-sm text-slate-300">نظام إدارة الموارد البشرية</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">مرحباً بك في نظام إدارة الموارد البشرية</h2>
            <p className="text-slate-300 leading-relaxed">
              نظام شامل ومتكامل لإدارة شؤون الموظفين، الحضور والانصراف، الإجازات، والرواتب
            </p>
          </div>


        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-xl bg-white dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center lg:hidden">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold dark:text-white">تسجيل الدخول</CardTitle>
            <CardDescription className="text-base dark:text-slate-400">
              أدخل بياناتك للوصول إلى حسابك
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium dark:text-slate-200">
                  اسم المستخدم
                </Label>
                <Input
                  id="username"
                  {...register("username")}
                  className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="أدخل اسم المستخدم"
                />
                {errors.username && (
                  <p className="text-sm text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium dark:text-slate-200">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="h-11 pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                    placeholder="أدخل كلمة المرور"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-9 w-9 dark:hover:bg-slate-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white"
                disabled={localLoading}
              >
                {localLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground dark:text-slate-500 pt-4">
                نظام إدارة الموارد البشرية © 2026
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
