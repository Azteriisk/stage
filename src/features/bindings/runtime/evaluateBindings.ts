import jsep, {
  type ArrayExpression,
  type BinaryExpression,
  type CallExpression,
  type Compound,
  type ConditionalExpression,
  type Expression,
  type Identifier,
  type Literal,
  type MemberExpression,
  type SequenceExpression,
  type UnaryExpression,
} from "jsep";
import type { Binding, BindingEvaluationContext } from "../../sessions/schema/session";

type ScopeValue =
  | number
  | string
  | boolean
  | undefined
  | Record<string, unknown>
  | unknown[]
  | ((...args: ScopeValue[]) => ScopeValue);

type EvaluationScope = {
  clamp: (...args: ScopeValue[]) => ScopeValue;
  smooth: (...args: ScopeValue[]) => ScopeValue;
  music: Record<string, ScopeValue>;
};

function toNumber(value: ScopeValue | undefined) {
  return Number(value ?? 0);
}

function createScope(context: BindingEvaluationContext): EvaluationScope {
  return {
    clamp: (...args) => {
      const [value = 0, min = 0, max = 0] = args;
      return Math.min(Math.max(toNumber(value), toNumber(min)), toNumber(max));
    },
    smooth: (...args) => {
      const [value = 0, factor = 1] = args;
      return toNumber(value) * toNumber(factor);
    },
    music: context.music,
  };
}

function evaluateBinaryExpression(
  node: BinaryExpression,
  scope: EvaluationScope,
): ScopeValue {
  const left = evaluateNode(node.left, scope);
  const right = evaluateNode(node.right, scope);

  switch (node.operator) {
    case "+":
      return toNumber(left) + toNumber(right);
    case "-":
      return toNumber(left) - toNumber(right);
    case "*":
      return toNumber(left) * toNumber(right);
    case "/":
      return toNumber(left) / toNumber(right);
    case "%":
      return toNumber(left) % toNumber(right);
    case "**":
      return toNumber(left) ** toNumber(right);
    case "<":
      return toNumber(left) < toNumber(right);
    case "<=":
      return toNumber(left) <= toNumber(right);
    case ">":
      return toNumber(left) > toNumber(right);
    case ">=":
      return toNumber(left) >= toNumber(right);
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case "&&":
      return Boolean(left) && Boolean(right);
    case "||":
      return Boolean(left) || Boolean(right);
    default:
      throw new Error(`Unsupported operator: ${node.operator}`);
  }
}

function evaluateUnaryExpression(
  node: UnaryExpression,
  scope: EvaluationScope,
): ScopeValue {
  const argument = evaluateNode(node.argument, scope);

  switch (node.operator) {
    case "+":
      return toNumber(argument);
    case "-":
      return -toNumber(argument);
    case "!":
      return !argument;
    default:
      throw new Error(`Unsupported unary operator: ${node.operator}`);
  }
}

function evaluateMemberExpression(
  node: MemberExpression,
  scope: EvaluationScope,
): ScopeValue {
  const objectValue = evaluateNode(node.object, scope);

  if (!objectValue || typeof objectValue !== "object") {
    throw new Error("Cannot read property of a non-object value.");
  }

  const propertyName = node.computed
    ? String(evaluateNode(node.property, scope))
    : (node.property as Identifier).name;

  return (objectValue as Record<string, ScopeValue>)[propertyName] ?? 0;
}

function evaluateCallExpression(
  node: CallExpression,
  scope: EvaluationScope,
): ScopeValue {
  const callee = evaluateNode(node.callee, scope);

  if (typeof callee !== "function") {
    throw new Error("Attempted to call a non-function binding helper.");
  }

  const args = node.arguments.map((argument) => evaluateNode(argument, scope));
  return callee(...args);
}

function evaluateArrayExpression(
  node: ArrayExpression,
  scope: EvaluationScope,
): ScopeValue {
  return node.elements.map((element) =>
    element ? evaluateNode(element, scope) : 0,
  );
}

function evaluateNode(node: Expression, scope: EvaluationScope): ScopeValue {
  switch (node.type) {
    case "Literal":
      return (node as Literal).value as ScopeValue;
    case "Identifier":
      return scope[(node as Identifier).name as keyof EvaluationScope] ?? 0;
    case "BinaryExpression":
      return evaluateBinaryExpression(node as BinaryExpression, scope);
    case "UnaryExpression":
      return evaluateUnaryExpression(node as UnaryExpression, scope);
    case "MemberExpression":
      return evaluateMemberExpression(node as MemberExpression, scope);
    case "CallExpression":
      return evaluateCallExpression(node as CallExpression, scope);
    case "ArrayExpression":
      return evaluateArrayExpression(node as ArrayExpression, scope);
    case "ConditionalExpression": {
      const conditionalNode = node as ConditionalExpression;
      return evaluateNode(conditionalNode.test, scope)
        ? evaluateNode(conditionalNode.consequent, scope)
        : evaluateNode(conditionalNode.alternate, scope);
    }
    case "Compound":
      return (node as Compound).body.reduce<ScopeValue>(
        (_, expression) => evaluateNode(expression, scope),
        0,
      );
    case "SequenceExpression":
      return (node as SequenceExpression).expressions.reduce<ScopeValue>(
        (_, expression) => evaluateNode(expression, scope),
        0,
      );
    default:
      throw new Error(`Unsupported expression type: ${node.type}`);
  }
}

export function evaluateBindings(
  bindings: Binding[],
  context: BindingEvaluationContext,
) {
  return evaluateCompiledBindings(compileBindings(bindings), context, {});
}

type CompiledBinding = {
  ast: Expression | null;
  binding: Binding;
};

export function compileBindings(bindings: Binding[]) {
  return bindings.map<CompiledBinding>((binding) => {
    try {
      return {
        ast: jsep(binding.expression),
        binding,
      };
    } catch {
      return {
        ast: null,
        binding,
      };
    }
  });
}

export function evaluateCompiledBindings(
  bindings: CompiledBinding[],
  context: BindingEvaluationContext,
  previousValues: Record<string, number>,
) {
  const resolved: Record<string, number> = {};
  const scope = createScope(context);

  for (const binding of bindings) {
    if (!binding.binding.enabled || !binding.ast) {
      continue;
    }

    try {
      const result = evaluateNode(binding.ast, scope);
      const numericResult = Number.isFinite(Number(result)) ? Number(result) : 0;
      const previousValue = previousValues[binding.binding.targetKey] ?? 0;
      const smoothing = Math.min(
        Math.max(binding.binding.smoothing ?? 0, 0),
        0.999,
      );
      const smoothedResult =
        smoothing > 0
          ? previousValue + (numericResult - previousValue) * (1 - smoothing)
          : numericResult;

      if (binding.binding.clamp) {
        resolved[binding.binding.targetKey] = Math.min(
          Math.max(smoothedResult, binding.binding.clamp.min),
          binding.binding.clamp.max,
        );
        continue;
      }

      resolved[binding.binding.targetKey] = smoothedResult;
    } catch {
      resolved[binding.binding.targetKey] = 0;
    }
  }

  return resolved;
}
