import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, CreateUserData, UpdateUserData } from "@/lib/api/users";
import { PaginationParams } from "@/types";
import { toast } from "sonner";

export function useUsers(params?: PaginationParams & { search?: string }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const result = await usersApi.getAll(params);
      console.log("Users API response:", result);
      return result;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم إنشاء المستخدم بنجاح");
    },
    onError: (error: any) => {
      console.error("❌ Create user error:", error);
      console.error("❌ Error response:", error.response);
      console.error("❌ Error data:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);

      // Extract error message
      let errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message;

      // If message is an array, get first element
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage[0];
      }

      // Convert to string if it's an object
      if (typeof errorMessage !== 'string') {
        errorMessage = typeof errorMessage === 'object' && errorMessage !== null
          ? JSON.stringify(errorMessage)
          : String(errorMessage);
      }

      // Translate common error messages to Arabic
      const errorTranslations: { [key: string]: string } = {
        "Password must be at least 8 characters": "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        "Email already exists": "البريد الإلكتروني مستخدم مسبقاً",
        "Username already exists": "اسم المستخدم مستخدم مسبقاً",
        "Invalid email format": "صيغة البريد الإلكتروني غير صحيحة",
        "Username is required": "اسم المستخدم مطلوب",
        "Email is required": "البريد الإلكتروني مطلوب",
        "Password is required": "كلمة المرور مطلوبة",
        "Full name is required": "الاسم الكامل مطلوب",
      };

      // Check if there's a direct translation
      const translatedMessage = errorTranslations[errorMessage];
      if (translatedMessage) {
        toast.error(translatedMessage);
        return;
      }

      // Check for specific error patterns
      if (error.response?.status === 409 ||
          errorMessage.includes("duplicate") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("موجود")) {
        toast.error("اسم المستخدم أو البريد الإلكتروني موجود مسبقاً");
      } else if (errorMessage.toLowerCase().includes("password")) {
        // Any password-related error
        if (errorMessage.includes("at least") || errorMessage.includes("8")) {
          toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
        } else {
          toast.error("خطأ في كلمة المرور");
        }
      } else if (errorMessage.includes("validation") || errorMessage.includes("required")) {
        toast.error("يرجى التحقق من جميع الحقول المطلوبة");
      } else {
        toast.error(errorMessage || "حدث خطأ أثناء إنشاء المستخدم");
      }
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم تحديث المستخدم بنجاح");
    },
    onError: (error: any) => {
      let errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          "حدث خطأ أثناء تحديث المستخدم";

      if (typeof errorMessage !== 'string') {
        errorMessage = typeof errorMessage === 'object' && errorMessage !== null
          ? JSON.stringify(errorMessage)
          : String(errorMessage);
      }

      toast.error(errorMessage);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم حذف المستخدم بنجاح");
    },
    onError: (error: any) => {
      let errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          "حدث خطأ أثناء حذف المستخدم";

      if (typeof errorMessage !== 'string') {
        errorMessage = typeof errorMessage === 'object' && errorMessage !== null
          ? JSON.stringify(errorMessage)
          : String(errorMessage);
      }

      toast.error(errorMessage);
    },
  });
}

export function useAssignRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      usersApi.assignRoles(id, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("تم تعيين الأدوار بنجاح");
    },
    onError: (error: any) => {
      let errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          "حدث خطأ أثناء تعيين الأدوار";

      if (typeof errorMessage !== 'string') {
        errorMessage = typeof errorMessage === 'object' && errorMessage !== null
          ? JSON.stringify(errorMessage)
          : String(errorMessage);
      }

      toast.error(errorMessage);
    },
  });
}
