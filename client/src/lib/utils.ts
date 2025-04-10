import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function smoothScrollTo(elementId: string, offsetPixels: number = 80) {
  const element = document.getElementById(elementId);
  if (element) {
    window.scrollTo({
      top: element.offsetTop - offsetPixels,
      behavior: "smooth",
    });
  }
}
