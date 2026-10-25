import {
  criteriaFields,
  operatorsByType,
  type Condition,
  type CriteriaField,
  type CriteriaGroup,
} from "@aml/shared";

// Pure, immutable helpers for editing the AND/OR tree. A path is the list of child indexes.
export type Path = number[];
type Node = CriteriaGroup | Condition;

export const getNode = (root: CriteriaGroup, path: Path): Node =>
  path.reduce<Node>((node, i) => (node as CriteriaGroup).children[i]!, root);

export const updateAt = (
  root: CriteriaGroup,
  path: Path,
  fn: (node: Node) => Node,
): CriteriaGroup => {
  if (path.length === 0) return fn(root) as CriteriaGroup;
  const [head, ...rest] = path;
  return {
    ...root,
    children: root.children.map((child, i) =>
      i === head ? (rest.length ? updateAt(child as CriteriaGroup, rest, fn) : fn(child)) : child,
    ),
  };
};

export const removeAt = (root: CriteriaGroup, path: Path): CriteriaGroup => {
  const parent = path.slice(0, -1);
  const index = path[path.length - 1]!;
  return updateAt(root, parent, (g) => ({
    ...(g as CriteriaGroup),
    children: (g as CriteriaGroup).children.filter((_, i) => i !== index),
  }));
};

export const appendAt = (root: CriteriaGroup, path: Path, node: Node): CriteriaGroup =>
  updateAt(root, path, (g) => ({
    ...(g as CriteriaGroup),
    children: [...(g as CriteriaGroup).children, node],
  }));

export const defaultValue = (field: CriteriaField, operator: string): Condition["value"] => {
  const type = criteriaFields[field].type;
  if (operator === "between") return type === "date" ? ["", ""] : [0, 0];
  if (operator === "in") return [];
  if (type === "number") return 0;
  if (type === "enum") return (criteriaFields[field] as { options: readonly string[] }).options[0]!;
  return "";
};

export const newCondition = (field: CriteriaField = "baseAmount"): Condition => {
  const operator = operatorsByType[criteriaFields[field].type][0];
  return { kind: "condition", field, operator, value: defaultValue(field, operator) };
};

export const newGroup = (): CriteriaGroup => ({
  kind: "group",
  combinator: "or",
  children: [newCondition()],
});

export const countConditions = (g: CriteriaGroup): number =>
  g.children.reduce((n, c) => n + (c.kind === "group" ? countConditions(c) : 1), 0);
