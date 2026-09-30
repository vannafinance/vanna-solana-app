export type Resource<T> =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; error: Error; retry: () => void }
  | { status: "ready"; data: T };
