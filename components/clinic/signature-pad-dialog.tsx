"use client";

import { useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";

interface SignaturePadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  signerName?: string;
  signerRole?: string;
  legalNotice?: string;
  onSign: (base64: string) => Promise<void>;
  isLoading?: boolean;
}

export function SignaturePadDialog({
  open,
  onOpenChange,
  title,
  signerName,
  signerRole,
  legalNotice,
  onSign,
  isLoading,
}: SignaturePadDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = async () => {
    if (!canvasRef.current || !hasSignature) return;
    const base64 = canvasRef.current.toDataURL("image/png");
    await onSign(base64);
    onOpenChange(false);
    clearSignature();
  };

  const now = new Date().toLocaleString("en-US");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) clearSignature(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {(signerName || signerRole) && (
            <DialogDescription>
              {signerName && <span className="font-medium">{signerName}</span>}
              {signerRole && <span className="text-muted-foreground"> — {signerRole}</span>}
            </DialogDescription>
          )}
        </DialogHeader>

        {legalNotice && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{legalNotice}</p>
          </div>
        )}

        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            width={380}
            height={160}
            className="w-full border-2 border-dashed border-border rounded-lg bg-white cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <p className="text-xs text-center text-muted-foreground">
            ارسم توقيعك بالماوس أو باللمس
          </p>
          <p className="text-xs text-center text-muted-foreground">
            التوقيع في: {now}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={clearSignature} disabled={!hasSignature}>
            <Trash2 className="h-4 w-4 ml-1" />
            مسح
          </Button>
          <Button variant="outline" onClick={() => { clearSignature(); onOpenChange(false); }}>
            إلغاء
          </Button>
          <Button onClick={handleConfirm} disabled={!hasSignature || isLoading}>
            {isLoading ? "جاري الحفظ..." : "تأكيد التوقيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
