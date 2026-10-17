"use client";

import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

/** Draws the chosen area onto a canvas and returns it as a JPEG (resized to at most `maxWidth`). */
const cropToBlob = async (src: string, area: Area, maxWidth: number) => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const scale = Math.min(1, maxWidth / area.width);
  const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(area.width * scale), height: Math.round(area.height * scale) });
  canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.88));
};

type Props = {
  file: File | null;
  aspect: number;
  round?: boolean;
  maxWidth?: number;
  title: string;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
};

/** Crop before upload: drag to move, slider or wheel to zoom. Only the cropped image leaves the browser. */
export const ImageCropDialog = ({ file, aspect, round, maxWidth = 1600, title, onCancel, onDone }: Props) => {
  const { t } = useTranslation();
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  if (file !== shown) {
    setShown(file);
    if (src) URL.revokeObjectURL(src);
    setSrc(file ? URL.createObjectURL(file) : null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("crop.hint")}</DialogDescription>
        </DialogHeader>
        <div className="relative h-80 overflow-hidden rounded-md bg-muted">
          {src ? <Cropper image={src} crop={crop} zoom={zoom} aspect={aspect} cropShape={round ? "round" : "rect"} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} /> : null}
        </div>
        <label className="flex items-center gap-3 text-sm">
          {t("crop.zoom")}
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--brand)]" />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>{t("forms.cancel")}</Button>
          <Button disabled={!area || busy} onClick={async () => { setBusy(true); try { onDone(await cropToBlob(src!, area!, maxWidth)); } finally { setBusy(false); } }}>
            {busy ? t("forms.saving") : t("crop.use")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
