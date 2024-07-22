/* node:coverage disable */

type Mock = { mock: { calls: { arguments: string[] }[] } };

export function spy(obj: unknown): Mock["mock"] {
  return (obj as Mock).mock;
}
