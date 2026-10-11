import type { Resource } from "@/types/resource";

export function mapResource<T, R>(resource: Resource<T>, build: (data: T) => R | null): Resource<R> {
  if (resource.status !== "ready") return resource;
  const built = build(resource.data);
  return built === null ? { status: "empty" } : { status: "ready", data: built };
}

export function combineResources<A, B, R>(first: Resource<A>, second: Resource<B>, build: (a: A, b: B) => R | null): Resource<R> {
  if (first.status === "error") return first;
  if (second.status === "error") return second;
  if (first.status === "loading" || second.status === "loading") return { status: "loading" };
  if (first.status === "empty" || second.status === "empty") return { status: "empty" };
  const built = build(first.data, second.data);
  return built === null ? { status: "empty" } : { status: "ready", data: built };
}
