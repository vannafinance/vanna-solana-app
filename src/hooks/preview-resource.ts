import type { Resource } from "@/types/resource";

export function previewResource<T>(data: T): Resource<T> {
  return { status: "ready", data };
}
